import { Component, ElementRef, Input, OnDestroy, Output, EventEmitter, NgZone, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMapsLoaderService } from '../../services/google-maps-loader.service';

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
  type?: 'pickup' | 'destination';
}

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a0a0b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a44' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#c0c0d8' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#33335a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a60' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#222244' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#7a7a98' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f0f23' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#505070' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2a2a44' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#606080' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#6a6a88' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#3a3a58' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#40405e' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1e1e36' }] },
];

function svgToUrl(svg: string): string {
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

const PICKUP_SVG = svgToUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs>
    <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <circle cx="16" cy="16" r="14" fill="#4fc3f7" opacity="0.15" filter="url(#s)"/>
  <circle cx="16" cy="16" r="10" fill="#4fc3f7" stroke="#fff" stroke-width="2.5"/>
  <circle cx="16" cy="16" r="4" fill="#fff"/>
</svg>`);

const DEST_SVG = svgToUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.4"/>
    </filter>
  </defs>
  <path d="M16 2C9.5 2 4 7.2 4 14c0 8 12 26 12 26s12-18 12-26c0-6.8-5.5-12-12-12z" fill="#ef5350" stroke="#fff" stroke-width="2" filter="url(#s)"/>
  <circle cx="16" cy="12" r="5" fill="#fff"/>
</svg>`);

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  @Input() set pickup(value: MapPoint | null) { this._pickup = value; this.syncMarkers(); }
  @Input() set destination(value: MapPoint | null) { this._destination = value; this.syncMarkers(); }
  @Input() selectionMode: 'pickup' | 'destination' | null = null;
  @Output() locationSelected = new EventEmitter<MapPoint>();

  private _pickup: MapPoint | null = null;
  private _destination: MapPoint | null = null;
  private map: google.maps.Map | null = null;
  private pickupMarker: google.maps.Marker | null = null;
  private destMarker: google.maps.Marker | null = null;
  private routeLine: google.maps.Polyline | null = null;
  private infoWindow: google.maps.InfoWindow | null = null;
  private centerLat = 12.9716;
  private centerLng = 77.5946;
  private gmaps: typeof google.maps | null = null;

  constructor(
    private ngZone: NgZone,
    private mapsLoader: GoogleMapsLoaderService,
  ) {}

  async ngAfterViewInit() {
    try {
      this.gmaps = await this.mapsLoader.load();
      this.initMap();
    } catch (err) {
      console.error('Failed to load Google Maps', err);
    }
  }

  ngOnDestroy() {
    this.infoWindow?.close();
    this.pickupMarker?.setMap(null);
    this.destMarker?.setMap(null);
    this.routeLine?.setMap(null);
  }

  onConfirmSelection() {
    if (this.selectionMode) {
      this.locationSelected.emit({ lat: this.centerLat, lng: this.centerLng, type: this.selectionMode });
    }
  }

  private initMap() {
    if (!this.mapContainer?.nativeElement || !this.gmaps) return;

    this.ngZone.runOutsideAngular(() => {
      this.map = new this.gmaps!.Map(this.mapContainer.nativeElement, {
        center: { lat: this.centerLat, lng: this.centerLng },
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        styles: DARK_STYLE,
        gestureHandling: 'greedy',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      this.map.addListener('center_changed', () => {
        const c = this.map!.getCenter()!;
        this.centerLat = c.lat();
        this.centerLng = c.lng();
      });

      this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!this.selectionMode && e.latLng) {
          this.ngZone.run(() => {
            this.locationSelected.emit({ lat: e.latLng!.lat(), lng: e.latLng!.lng() });
          });
        }
      });
    });

    this.syncMarkers();
  }

  private syncMarkers() {
    if (!this.map || !this.gmaps) return;
    this.clearMarkers();
    this.clearRoute();

    if (this._pickup) {
      this.pickupMarker = new this.gmaps.Marker({
        position: { lat: this._pickup.lat, lng: this._pickup.lng },
        map: this.map,
        icon: {
          url: PICKUP_SVG,
          anchor: new this.gmaps.Point(16, 16),
          scaledSize: new this.gmaps.Size(32, 32),
        },
        zIndex: 10,
        draggable: true,
      });
      this.pickupMarker.addListener('click', () => {
        this.showInfo(this._pickup!.label || 'Pickup', this._pickup!);
      });
      this.pickupMarker.addListener('dragend', (e: any) => {
        const pos = e.latLng;
        this._pickup = { ...this._pickup!, lat: pos.lat(), lng: pos.lng() };
        this.ngZone.run(() => {
          this.locationSelected.emit({ lat: pos.lat(), lng: pos.lng(), type: 'pickup' });
        });
      });
    }

    if (this._destination) {
      this.destMarker = new this.gmaps.Marker({
        position: { lat: this._destination.lat, lng: this._destination.lng },
        map: this.map,
        icon: {
          url: DEST_SVG,
          anchor: new this.gmaps.Point(16, 42),
          scaledSize: new this.gmaps.Size(32, 44),
        },
        zIndex: 10,
        animation: this.gmaps.Animation.DROP,
        draggable: true,
      });
      this.destMarker.addListener('click', () => {
        this.showInfo(this._destination!.label || 'Destination', this._destination!);
      });
      this.destMarker.addListener('dragend', (e: any) => {
        const pos = e.latLng;
        this._destination = { ...this._destination!, lat: pos.lat(), lng: pos.lng() };
        this.ngZone.run(() => {
          this.locationSelected.emit({ lat: pos.lat(), lng: pos.lng(), type: 'destination' });
        });
      });
    }

    if (this._pickup && this._destination) {
      this.routeLine = new this.gmaps.Polyline({
        path: [
          { lat: this._pickup.lat, lng: this._pickup.lng },
          { lat: this._destination.lat, lng: this._destination.lng },
        ],
        geodesic: true,
        strokeColor: '#818cf8',
        strokeOpacity: 0.5,
        strokeWeight: 3,
        icons: [{
          icon: { path: this.gmaps.SymbolPath.FORWARD_CLOSED_ARROW },
          offset: '0',
          repeat: '20px',
        }],
        zIndex: 5,
      });
      this.routeLine.setMap(this.map);

      const bounds = new this.gmaps.LatLngBounds();
      bounds.extend({ lat: this._pickup.lat, lng: this._pickup.lng });
      bounds.extend({ lat: this._destination.lat, lng: this._destination.lng });
      this.map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });
      const listener = this.map.addListener('idle', () => {
        if (this.map && this.map.getZoom()! > 15) this.map.setZoom(15);
        this.gmaps!.event.removeListener(listener);
      });
    } else if (this._pickup) {
      this.map.setCenter({ lat: this._pickup.lat, lng: this._pickup.lng });
      this.map.setZoom(14);
    }
  }

  private showInfo(text: string, point: MapPoint) {
    if (!this.gmaps) return;
    const label = text;
    const coords = `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
    this.infoWindow?.close();
    this.infoWindow = new this.gmaps.InfoWindow({
      content: `<div style="color:#fff;font-size:13px;padding:4px 8px;font-family:inherit;line-height:1.4">
        <div style="font-weight:500;margin-bottom:2px">${label}</div>
        <div style="color:#a0a0b8;font-size:11px">${coords}</div>
      </div>`,
      pixelOffset: new this.gmaps.Size(0, -8),
    });
    if (this.pickupMarker && point === this._pickup) this.infoWindow.open(this.map, this.pickupMarker);
    else if (this.destMarker) this.infoWindow.open(this.map, this.destMarker);
  }

  private clearMarkers() {
    if (this.pickupMarker) { this.pickupMarker.setMap(null); this.pickupMarker = null; }
    if (this.destMarker) { this.destMarker.setMap(null); this.destMarker = null; }
  }

  private clearRoute() {
    if (this.routeLine) { this.routeLine.setMap(null); this.routeLine = null; }
  }
}
