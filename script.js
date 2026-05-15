var OLMap = null;
var StaticFeatures = new ol.Collection();
var PlaneIconFeatures = new ol.Collection();
var PlaneTrailFeatures = new ol.Collection();
var Planes = {};
var PlanesOrdered = [];
var SelectedPlane = null;
var FollowSelected = false;

function processReceiverUpdate(data) {
    var now = data.now;
    var acs = data.aircraft;

    if (MessageCountHistory.length > 0 && MessageCountHistory[MessageCountHistory.length-1].messages > data.messages) {
        MessageCountHistory = [{'time' : MessageCountHistory[MessageCountHistory.length-1].time,
            'messages' : 0}];
    }

    MessageCountHistory.push({ 'time' : now, 'messages' : data.messages});

    if ((now - MessageCountHistory[0].time) > 30)
        MessageCountHistory.shift();

    for (var j=0; j < acs.length; j++) {
        var ac = acs[j];
        var hex = ac.hex;
        var plane = null;


    }

}

#โหลดข้อมูล
function fetchData() {
    if (FetchPending !== null && FetchPending.state() == 'pending') {
                // don't double up on fetches, let the last one resolve
                return;
        }

	FetchPending = $.ajax({ url: 'data/aircraft.json',
                                timeout: 5000,
                                cache: false,
                                dataType: 'json' });
        FetchPending.done(function(data) {
                var now = data.now;

                processReceiverUpdate(data);

                // update timestamps, visibility, history track for all planes - not only those updated
                for (var i = 0; i < PlanesOrdered.length; ++i) {
                        var plane = PlanesOrdered[i];
                        plane.updateTick(now, LastReceiverTimestamp);
                }
                
		refreshTableInfo();
		refreshSelected();
                
                if (ReceiverClock) {
                        var rcv = new Date(now * 1000);
                        ReceiverClock.render(rcv.getUTCHours(),rcv.getUTCMinutes(),rcv.getUTCSeconds());
                }

                // Check for stale receiver data
                if (LastReceiverTimestamp === now) {
                        StaleReceiverCount++;
                        if (StaleReceiverCount > 5) {
                                $("#update_error_detail").text("The data from dump1090 hasn't been updated in a while. Maybe dump1090 is no longer running?");
                                $("#update_error").css('display','block');
                        }
                } else { 
                        StaleReceiverCount = 0;
                        LastReceiverTimestamp = now;
                        $("#update_error").css('display','none');
                }
	});

        FetchPending.fail(function(jqxhr, status, error) {
                $("#update_error_detail").text("AJAX call failed (" + status + (error ? (": " + error) : "") + "). Maybe dump1090 is no longer running?");
                $("#update_error").css('display','block');
        });
}

function initialize() {

}

function start_load_history() {

}

function load_history_item(i) {
    if (i >= PositionHistorySize) {
                end_load_history();
                return;
        }

        console.log("Loading history #" + i);
        $("#loader_progress").attr('value',i);

        $.ajax({ url: 'data/history_' + i + '.json',
                 timeout: 5000,
                 cache: false,
                 dataType: 'json' })

                .done(function(data) {
                        PositionHistoryBuffer.push(data);
                        load_history_item(i+1);
                })

                .fail(function(jqxhr, status, error) {
                        // No more history
                        end_load_history();
                });
}

function end_load_history() {
    $("#loader").addClass("hidden");

    console.log("Done loading history");

    if (PositionHistoryBuffer.length > 0) {
        var now, last=0;
    }
}

function make_geodesic_circle(center, radius, points) {
    var lat1 = center[1] * Math.PI / 180.0;
    var geom = new ol.geom.LineString();
    for (var i = 0; i <= points; ++i) {
        var bearing = i * 2 *Math.PI / points;

        var lat2 = Math.asin()
    }
}

function initialize_map() {
    // Load stored map settings if present
        CenterLat = Number(localStorage['CenterLat']) || DefaultCenterLat;
        CenterLon = Number(localStorage['CenterLon']) || DefaultCenterLon;
        ZoomLvl = Number(localStorage['ZoomLvl']) || DefaultZoomLvl;
        MapType = localStorage['MapType'];

        // Set SitePosition, initialize sorting
        if (SiteShow && (typeof SiteLat !==  'undefined') && (typeof SiteLon !==  'undefined')) {
	        SitePosition = [SiteLon, SiteLat];
                sortByDistance();
        } else {
	        SitePosition = null;
                PlaneRowTemplate.cells[6].style.display = 'none'; // hide distance column
                document.getElementById("distance").style.display = 'none'; // hide distance header
                sortByAltitude();
        }

        // Maybe hide flag info
        if (!ShowFlags) {
                PlaneRowTemplate.cells[1].style.display = 'none'; // hide flag column
                document.getElementById("flag").style.display = 'none'; // hide flag header
                document.getElementById("infoblock_country").style.display = 'none'; // hide country row
        }

        // Initialize OL3

        var layers = createBaseLayers();

        var iconsLayer = new ol.layer.Vector({
                name: 'ac_positions',
                type: 'overlay',
                title: 'Aircraft positions',
                source: new ol.source.Vector({
                        features: PlaneIconFeatures,
                }),
                zIndex: 2
        });

        layers.push(new ol.layer.Group({
                title: 'Overlays',
                layers: [
                        new ol.layer.Vector({
                                name: 'site_pos',
                                type: 'overlay',
                                title: 'Site position and range rings',
                                source: new ol.source.Vector({
                                        features: StaticFeatures,
                                }),
                        }),

                        new ol.layer.Vector({
                                name: 'ac_trail',
                                type: 'overlay',
                                title: 'Selected aircraft trail',
                                source: new ol.source.Vector({
                                        features: PlaneTrailFeatures,
                                }),
                                zIndex: 2
                        }),

                        iconsLayer
                ]
        }));

        var foundType = false;

        ol.control.LayerSwitcher.forEachRecursive(layers, function(lyr) {
                if (!lyr.get('name'))
                        return;

                if (lyr.get('type') === 'base') {
                        if (MapType === lyr.get('name')) {
                                foundType = true;
                                lyr.setVisible(true);
                        } else {
                                lyr.setVisible(false);
                        }

                        lyr.on('change:visible', function(evt) {
                                if (evt.target.getVisible()) {
                                        MapType = localStorage['MapType'] = evt.target.get('name');
                                }
                        });
                } else if (lyr.get('type') === 'overlay') {
                        var visible = localStorage['layer_' + lyr.get('name')];
                        if (visible != undefined) {
                                // javascript, why must you taunt me with gratuitous type problems
                                lyr.setVisible(visible === "true");
                        }

                        lyr.on('change:visible', function(evt) {
                                localStorage['layer_' + evt.target.get('name')] = evt.target.getVisible();
                        });
                }
        })

        if (!foundType) {
                ol.control.LayerSwitcher.forEachRecursive(layers, function(lyr) {
                        if (foundType)
                                return;
                        if (lyr.get('type') === 'base') {
                                lyr.setVisible(true);
                                foundType = true;
                        }
                });
        }

        OLMap = new ol.Map({
                target: 'map_canvas',
                layers: layers,
                // view: new ol.View({
                //         center: ol.proj.fromLonLat([CenterLon, CenterLat]),
                //         zoom: ZoomLvl
                // }),
                view: new ol.View({
                        center: ol.proj.fromLonLat([98.3923, 7.8804]),
                        zoom: 10
                }),
                controls: [new ol.control.Zoom(),
                           new ol.control.Rotate(),
                           new ol.control.Attribution({collapsed: false}),
                           new ol.control.ScaleLine({units: Metric ? "metric" : "nautical"}),
                           new ol.control.LayerSwitcher()
                          ],
                loadTilesWhileAnimating: true,
                loadTilesWhileInteracting: true
        });

	// Listeners for newly created Map
        OLMap.getView().on('change:center', function(event) {
                var center = ol.proj.toLonLat(OLMap.getView().getCenter(), OLMap.getView().getProjection());
                localStorage['CenterLon'] = center[0]
                localStorage['CenterLat'] = center[1]
                if (FollowSelected) {
                        // On manual navigation, disable follow
                        var selected = Planes[SelectedPlane];
                        if (Math.abs(center[0] - selected.position[0]) > 0.0001 &&
                            Math.abs(center[1] - selected.position[1]) > 0.0001) {
                                FollowSelected = false;
                                refreshSelected();
                        }
                }
        });
    
        OLMap.getView().on('change:resolution', function(event) {
                localStorage['ZoomLvl']  = OLMap.getView().getZoom();
        });

        OLMap.on(['click', 'dblclick'], function(evt) {
                var hex = evt.map.forEachFeatureAtPixel(evt.pixel,
                                                        function(feature, layer) {
                                                                return feature.hex;
                                                        },
                                                        null,
                                                        function(layer) {
                                                                return (layer === iconsLayer);
                                                        },
                                                        null);
                if (hex) {
                        selectPlaneByHex(hex, (evt.type === 'dblclick'));
                        evt.stopPropagation();
                }
        });

	// Add home marker if requested
	if (SitePosition) {
                var markerStyle = new ol.style.Style({
                        image: new ol.style.Circle({
                                radius: 7,
                                snapToPixel: false,
                                fill: new ol.style.Fill({color: 'black'}),
                                stroke: new ol.style.Stroke({
                                        color: 'white', width: 2
                                })
                        })
                });

                var feature = new ol.Feature(new ol.geom.Point(ol.proj.fromLonLat(SitePosition)));
                feature.setStyle(markerStyle);
                StaticFeatures.push(feature);
        
                if (SiteCircles) {
                        var circleStyle = new ol.style.Style({
                                fill: null,
                                stroke: new ol.style.Stroke({
                                        color: '#000000',
                                        width: 1
                                })
                        });

                        for (var i=0; i < SiteCirclesDistances.length; ++i) {
                                var distance = SiteCirclesDistances[i] * 1000.0;
                                if (!Metric) {
                                        distance *= 1.852;
                                }

                                var circle = make_geodesic_circle(SitePosition, distance, 360);
                                circle.transform('EPSG:4326', 'EPSG:3857');
                                var feature = new ol.Feature(circle);
                                feature.setStyle(circleStyle);
                                StaticFeatures.push(feature);
                        }
                }
	}

        // Vector Source SID
        const sidSource = new ol.source.Vector();
        const sidLayer = new ol.layer.Vector({
        source: sidSource,
        zIndex: 1
        });
        OLMap.addLayer(sidLayer);

        // Vector Source STAR
        const starSource = new ol.source.Vector();
        const starLayer = new ol.layer.Vector({
        source: starSource,
        zIndex: 1
        });
        OLMap.addLayer(starLayer);

        // load sid.json
        fetch('./sid.json')
        .then(response => {
        if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
        })
        .then(data => {
        if (data.sid_waypoints) {
                data.sid_waypoints.forEach(point => {
                const feature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([point.lon, point.lat])),
                name: point.SID,
                });

                feature.setStyle(new ol.style.Style({
                image: new ol.style.Circle({
                radius: 6,
                stroke: new ol.style.Stroke({ color: 'red', width: 2 }),
                fill: new ol.style.Fill({ color: '#FFFFFF' }),
                zIndex: 1
                }),
                text: new ol.style.Text({
                text: point.SID,
                font: '10px Arial, sans-serif',
                fill: new ol.style.Fill({ color: 'black' }),
                stroke: new ol.style.Stroke({ color: 'white', width: 2 }),
                offsetY: -12,
                zIndex: 1
                })
                }));

                sidSource.addFeature(feature);
                });
        } else {
                console.error('No SID Data');
        }
        })
        .catch(error => console.error('Error loading SID JSON:', error));

        // load star.json
        fetch('./star.json')
        .then(response => {
        if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
        })
        .then(data => {
        if (data.star_waypoints) {
                data.star_waypoints.forEach(point => {
                const feature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([point.lon, point.lat])),
                name: point.STAR
                });

                if (point.STAR === 'KALIM' || point.STAR === 'BARON') {
                        feature.setStyle(new ol.style.Style({
                          image: new ol.style.Circle({
                            radius: 8,
                            stroke: new ol.style.Stroke({ color: '#FFD700', width: 3 }),
                            fill: new ol.style.Fill({ color: '#FFF0F5' }),
                            zIndex: 1
                          }),
                          text: new ol.style.Text({
                            text: point.STAR,
                            font: '12px Arial, sans-serif',
                            fill: new ol.style.Fill({ color: 'black' }),
                            stroke: new ol.style.Stroke({ color: 'white', width: 2 }),
                            offsetY: -15,
                            zIndex: 1
                          })
                        }));
                      } 
                else {
                        feature.setStyle(new ol.style.Style({
                        image: new ol.style.Circle({
                        radius: 6,
                        stroke: new ol.style.Stroke({ color: 'blue', width: 2 }) ,
                        fill: new ol.style.Fill({ color: '#F0F8FF' }),
                        zIndex: 1
                        }),
                        text: new ol.style.Text({
                        text: point.STAR,
                        font: '10px Arial, sans-serif',
                        fill: new ol.style.Fill({ color: 'black' }),
                        stroke: new ol.style.Stroke({ color: 'white', width: 2 }),
                        offsetY: -12,
                        zIndex: 1
                        })
                        }));
                }

                starSource.addFeature(feature);
                });

                // waypoints
                const waypointMap = {};
                data.star_waypoints.forEach(p => {
                waypointMap[p.STAR] = p;
                });

                const connections_1st_point = [
                        // to BARON point Runway 22
                        { from: 'MONBU', to: 'STONE' },
                        { from: 'SAVSA', to: 'STONE' },
                        { from: 'IGEVI', to: 'STONE' },
                        { from: 'SUSID', to: 'STONE' },
                        { from: 'STONE', to: 'CIDER' },
                        { from: 'ONETI', to: 'SP112' },
                        { from: 'EMRIT', to: 'SP112' },
                        { from: 'EPGOT', to: 'SP112' },
                        { from: 'PACUS', to: 'RIZZO' },
                        { from: 'URGAD', to: 'PACUS' },
                        // to KALIM point Runway 09
                        { from: 'UBNEN', to: 'SP312' },
                        { from: 'ANPUB', to: 'SP312' },
                        { from: 'JUVEY', to: 'RAWAI' },
                        { from: 'TARPU', to: 'SP702' },
                        { from: 'SATVA', to: 'TARPU' },
                        { from: 'UPSAB', to: 'TARPU' },
                        { from: 'SUSID', to: 'TARPU' },
                        { from: 'IGEVI', to: 'TARPU' },
                        { from: 'MILAN', to: 'SP702' },
                        { from: 'SAVSA', to: 'MILAN' },
                        { from: 'MONBU', to: 'MILAN' },
                        { from: 'ONETI', to: 'MILAN' },
                        { from: 'URGAD', to: 'SP801' },
                        { from: 'SP801', to: 'JUVEY' },
                        { from: 'SP803', to: 'JUVEY' },
                        { from: 'EMRIT', to: 'SP803' },
                        { from: 'EPGOT', to: 'SP803' },
                      ];
                const connections_final_point = [
                        // runway 09
                        { from: 'SP312', to: 'KALIM' },
                        { from: 'SP702', to: 'KALIM' },
                        { from: 'RAWAI', to: 'KALIM' },
                        // runway 27
                        { from: 'SP112', to: 'BARON' },
                        { from: 'CIDER', to: 'BARON' },
                        { from: 'RIZZO', to: 'BARON' },
                        ];
                      
                      connections_1st_point.forEach(conn => {
                        const from = waypointMap[conn.from];
                        const to = waypointMap[conn.to];
                        if (from && to) {
                          const line = new ol.Feature({
                            geometry: new ol.geom.LineString([
                              ol.proj.fromLonLat([from.lon, from.lat]),
                              ol.proj.fromLonLat([to.lon, to.lat])
                            ])
                          });
                          line.setStyle(new ol.style.Style({
                            stroke: new ol.style.Stroke({
                              color: '#99FF00', 
                              width: 1.8,
                              lineDash: [5, 10],
                              zIndex: 0
                            })
                          }));
                          starSource.addFeature(line);
                        } else {
                          console.warn(`Connection not found: ${conn.from} -> ${conn.to}`);
                        }
                      });

                connections_final_point.forEach(conn => {
                const from = waypointMap[conn.from];
                const to = waypointMap[conn.to];
                if (from && to) {
                const line = new ol.Feature({
                geometry: new ol.geom.LineString([
                        ol.proj.fromLonLat([from.lon, from.lat]),
                        ol.proj.fromLonLat([to.lon, to.lat])
                ])
                });
                line.setStyle(new ol.style.Style({
                stroke: new ol.style.Stroke({
                        color: '#FFD700',
                        width: 2.5,
                        zIndex: 0
                })
                }));
                starSource.addFeature(line);
                
                } else {
                console.warn('not found in STAR waypoints:', conn);
                }
                
                });
        } else {
                console.error('No STAR Data');
        }
        })
        .catch(error => console.error('Error loading STAR JSON:', error));

        // เปิด-ปิด SID
        const toggleSidBtn = document.getElementById('toggle-sid');
        if (toggleSidBtn) {
        toggleSidBtn.addEventListener('click', () => {
        const visible = sidLayer.getVisible();
        sidLayer.setVisible(!visible);
        });
        }

        // เปิด-ปิด STAR
        const toggleStarBtn = document.getElementById('toggle-star');
        if (toggleStarBtn) {
        toggleStarBtn.addEventListener('click', () => {
        const visible = starLayer.getVisible();
        starLayer.setVisible(!visible);
        });
        }

        // Add terrain-limit rings. To enable this:
        //
        //  create a panorama for your receiver location on heywhatsthat.com
        //
        //  note the "view" value from the URL at the top of the panorama
        //    i.e. the XXXX in http://www.heywhatsthat.com/?view=XXXX
        //
        // fetch a json file from the API for the altitudes you want to see:
        //
        //  wget -O /usr/share/dump1090-mutability/html/upintheair.json \
        //    'http://www.heywhatsthat.com/api/upintheair.json?id=XXXX&refraction=0.25&alts=3048,9144'
        //
        // NB: altitudes are in _meters_, you can specify a list of altitudes

        // kick off an ajax request that will add the rings when it's done
        var request = $.ajax({ url: 'upintheair.json',
                               timeout: 5000,
                               cache: true,
                               dataType: 'json' });
        request.done(function(data) {
                var ringStyle = new ol.style.Style({
                        fill: null,
                        stroke: new ol.style.Stroke({
                                color: '#000000',
                                width: 1
                        })
                });

                for (var i = 0; i < data.rings.length; ++i) {
                        var geom = new ol.geom.LineString();
                        var points = data.rings[i].points;
                        if (points.length > 0) {
                                for (var j = 0; j < points.length; ++j) {
                                        geom.appendCoordinate([ points[j][1], points[j][0] ]);
                                }
                                geom.appendCoordinate([ points[0][1], points[0][0] ]);
                                geom.transform('EPSG:4326', 'EPSG:3857');

                                var feature = new ol.Feature(geom);
                                feature.setStyle(ringStyle);
                                StaticFeatures.push(feature);
                        }
                }
        });

        request.fail(function(jqxhr, status, error) {
                // no rings available, do nothing
        });
}

function reaper() {
    var newPlanes = [];
    for (var i = 0; i < PlanesOrdered.length; ++i) {
        var plane = PlanesOrdered[i];
    }
}

function refreshPageTitle() {

}

function refreshSelected() {

}

function refreshTableInfo() {

}

function compareAplha() {

}