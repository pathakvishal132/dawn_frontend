import { Component, ElementRef, Input, OnDestroy, Output, EventEmitter, NgZone, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
  type?: 'pickup' | 'destination';
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  @Input() set pickup(value: MapPoint | null) { 
    this._pickup = value; 
    this.syncMarkers(); 
  }
  @Input() set destination(value: MapPoint | null) { 
    this._destination = value; 
    this.syncMarkers(); 
  }
  @Input() selectionMode: 'pickup' | 'destination' | null = null;
  @Output() locationSelected = new EventEmitter<MapPoint>();

  private _pickup: MapPoint | null = null;
  private _destination: MapPoint | null = null;
  private map: L.Map | null = null;
  private pickupMarker: L.Marker | null = null;
  private destMarker: L.Marker | null = null;
  private routeLine: L.Polyline | null = null;
  private centerLat = 12.9716;
  private centerLng = 77.5946;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    this.clearMarkers();
    this.clearRoute();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  onConfirmSelection() {
    if (this.selectionMode) {
      this.locationSelected.emit({ 
        lat: this.centerLat, 
        lng: this.centerLng, 
        type: this.selectionMode 
      });
    }
  }

  private initMap() {
    if (!this.mapContainer?.nativeElement) return;

    this.ngZone.runOutsideAngular(() => {
      this.map = L.map(this.mapContainer.nativeElement, {
        center: [this.centerLat, this.centerLng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        zoomSnap: 0.5
      });

      // Load premium styled CartoDB Dark Matter tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(this.map);

      // Re-enable zoom control in bottom-right corner rather than default top-left
      L.control.zoom({
        position: 'bottomright'
      }).addTo(this.map);

      this.map.on('move', () => {
        const center = this.map!.getCenter();
        this.centerLat = center.lat;
        this.centerLng = center.lng;
      });

      this.map.on('click', (e: L.LeafletMouseEvent) => {
        if (!this.selectionMode) {
          this.ngZone.run(() => {
            this.locationSelected.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
          });
        }
      });
    });

    this.syncMarkers();
  }

  private syncMarkers() {
    if (!this.map) return;
    this.clearMarkers();
    this.clearRoute();

    if (this._pickup) {
      const pickupIcon = L.divIcon({
        className: 'custom-marker-pickup',
        html: `<div class="marker-dot-pickup">
                 <span class="pulse-ring"></span>
                 <span class="center-dot"></span>
               </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      this.pickupMarker = L.marker([this._pickup.lat, this._pickup.lng], {
        icon: pickupIcon,
        draggable: true,
        zIndexOffset: 100
      }).addTo(this.map);

      this.pickupMarker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        this._pickup = { ...this._pickup!, lat: pos.lat, lng: pos.lng };
        this.ngZone.run(() => {
          this.locationSelected.emit({ lat: pos.lat, lng: pos.lng, type: 'pickup' });
        });
      });
    }

    if (this._destination) {
      const destIcon = L.divIcon({
        className: 'custom-marker-dest',
        html: `<div class="marker-pin-dest">
                 <div class="pin-icon"><i class="material-icons">place</i></div>
                 <div class="pin-shadow"></div>
               </div>`,
        iconSize: [40, 48],
        iconAnchor: [20, 44]
      });

      this.destMarker = L.marker([this._destination.lat, this._destination.lng], {
        icon: destIcon,
        draggable: true,
        zIndexOffset: 100
      }).addTo(this.map);

      this.destMarker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        this._destination = { ...this._destination!, lat: pos.lat, lng: pos.lng };
        this.ngZone.run(() => {
          this.locationSelected.emit({ lat: pos.lat, lng: pos.lng, type: 'destination' });
        });
      });
    }

    if (this._pickup && this._destination) {
      this.routeLine = L.polyline(
        [
          [this._pickup.lat, this._pickup.lng],
          [this._destination.lat, this._destination.lng]
        ],
        {
          color: '#6366f1',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 12',
          className: 'animated-route-line'
        }
      ).addTo(this.map);

      const bounds = L.latLngBounds(
        [this._pickup.lat, this._pickup.lng],
        [this._destination.lat, this._destination.lng]
      );
      
      this.map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
        animate: true,
        duration: 1.0
      });
    } else if (this._pickup) {
      this.map.setView([this._pickup.lat, this._pickup.lng], 14, {
        animate: true,
        duration: 0.8
      });
    }
  }

  private clearMarkers() {
    if (this.pickupMarker && this.map) {
      this.pickupMarker.remove();
      this.pickupMarker = null;
    }
    if (this.destMarker && this.map) {
      this.destMarker.remove();
      this.destMarker = null;
    }
  }

  private clearRoute() {
    if (this.routeLine && this.map) {
      this.routeLine.remove();
      this.routeLine = null;
    }
  }
}
