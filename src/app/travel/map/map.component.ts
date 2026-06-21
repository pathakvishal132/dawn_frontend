import { Component, ElementRef, Input, OnDestroy, Output, EventEmitter, NgZone, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

export interface MapPoint {
  lat: number;
  lng: number;
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

  @Input() set pickup(value: MapPoint | null) { this._pickup = value; this.syncMarkers(); }
  @Input() set destination(value: MapPoint | null) { this._destination = value; this.syncMarkers(); }
  @Input() selectionMode: 'pickup' | 'destination' | null = null;
  @Output() locationSelected = new EventEmitter<MapPoint>();

  private _pickup: MapPoint | null = null;
  private _destination: MapPoint | null = null;
  private map: L.Map | null = null;
  private pickupMarker: L.Marker | null = null;
  private destMarker: L.Marker | null = null;
  private centerLat = 12.9716;
  private centerLng = 77.5946;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  onConfirmSelection() {
    if (this.selectionMode) {
      this.locationSelected.emit({ lat: this.centerLat, lng: this.centerLng });
    }
  }

  private initMap() {
    if (!this.mapContainer?.nativeElement) return;

    this.ngZone.runOutsideAngular(() => {
      this.map = L.map(this.mapContainer.nativeElement, {
        center: [this.centerLat, this.centerLng],
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(this.map!);

      this.map.on('moveend', () => {
        const c = this.map!.getCenter();
        this.centerLat = c.lat;
        this.centerLng = c.lng;
      });
    });

    setTimeout(() => this.map?.invalidateSize(), 100);

    this.syncMarkers();
  }

  private syncMarkers() {
    if (!this.map) return;
    this.clearMarkers();

    if (this._pickup) {
      this.pickupMarker = L.marker([this._pickup.lat, this._pickup.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="display:flex;align-items:center;gap:4px;"><div style="background:#4fc3f7;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div><span style="font-size:10px;font-weight:600;color:#fff;background:rgba(0,0,0,0.6);padding:2px 6px;border-radius:4px;">Pickup</span></div>`,
          iconSize: [80, 20],
          iconAnchor: [7, 10],
        }),
      }).addTo(this.map);
    }

    if (this._destination) {
      this.destMarker = L.marker([this._destination.lat, this._destination.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="display:flex;align-items:center;gap:4px;"><div style="background:#ef5350;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div><span style="font-size:10px;font-weight:600;color:#fff;background:rgba(0,0,0,0.6);padding:2px 6px;border-radius:4px;">Drop</span></div>`,
          iconSize: [76, 20],
          iconAnchor: [7, 10],
        }),
      }).addTo(this.map);
    }

    if (this._pickup && this._destination) {
      this.map.fitBounds(L.latLngBounds(
        [this._pickup.lat, this._pickup.lng],
        [this._destination.lat, this._destination.lng],
      ), { padding: [80, 80], maxZoom: 15 });
    } else if (this._pickup) {
      this.map.setView([this._pickup.lat, this._pickup.lng], 14);
    }
  }

  private clearMarkers() {
    if (this.pickupMarker) { this.map?.removeLayer(this.pickupMarker); this.pickupMarker = null; }
    if (this.destMarker) { this.map?.removeLayer(this.destMarker); this.destMarker = null; }
  }
}
