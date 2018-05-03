/*
 * ngsi-datamodel2heatmap
 * https://github.com/mognom/ngsi-datamodel2heatmap-operator
 *
 * Copyright (c) 2018 CoNWeT
 * Licensed under the MIT license.
 */

(function () {

    "use strict";

    var parseInputEndpointData = function parseInputEndpointData(data) {
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                throw new MashupPlatform.wiring.EndpointTypeError();
            }
        }

        if (data == null || typeof data !== "object") {
            throw new MashupPlatform.wiring.EndpointTypeError();
        }

        return data;
    };

    var configFromNGSI = {
        AirQualityObserved: {
            key: function (x) {
                return x.NO2;
            },
            max: undefined,
            radius: 0.015
        },
        Streetlight: {
            key: function (x) {
                return x.lanternHeight;
            },
            max: 12,
            radius: 0.0002
        },
        OffStreetParking: {
            key: function (x) {
                return x.totalSpotNumber - x.availableSpotNumber;
            },
            max: undefined,
            radius: 0.015
        },
        OnStreetParking: {
            key: function (x) {
                return x.totalSpotNumber - x.availableSpotNumber;
            },
            max: undefined,
            radius: 0.015
        }
    };

    var init = function init() {
        MashupPlatform.wiring.registerCallback('input', generateHeatmapLayer);
    };

    var generateHeatmapLayer = function generateHeatmapLayer(data) {
        var entities = parseInputEndpointData(data);

        if (!Array.isArray(entities)) {
            entities = [entities];
        }
        var config = configFromNGSI[entities[0].type];
        if (!config) {
            MashupPlatform.operator.log("Input NGSI type is not supported by this operator", MashupPlatform.log.ERROR);
            return;
        }

        // Get feature data
        var max = config.key(entities[0]);
        entities = entities.map(function (entity) {
            var weight = config.key(entity);
            if (weight > max) {
                max = weight;
            }

            return {
                location: entity.location,
                lat: entity.location.coordinates[1],
                lng: entity.location.coordinates[0],
                weight: weight
            };
        });
        // Use the defined max for the datamodel if exists
        max = config.max !== undefined ? config.max : max;

        if (MashupPlatform.operator.outputs.ol3heatmapLayer.connected) {
            // Create heatmap layer
            var ol3heatMap = {
                "action": "addLayer",
                "data": {
                    "id": 8,
                    "max": max,
                    "blur": 35,
                    "radius": 35,
                    "type": "Heatmap",
                    "features": entities
                }
            };

            MashupPlatform.wiring.pushEvent("ol3heatmapLayer", ol3heatMap);
        }

        if (MashupPlatform.operator.outputs.leafletheatmapLayer.connected) {
            // Create heatmap layer
            var leafletheatMap = {
                "id": 8,
                "max": max,
                "radius": config.radius,
                "useLocalExtrema": false,
                "scaleRadius": true,
                "features": entities
            };

            MashupPlatform.wiring.pushEvent("leafletheatmapLayer", leafletheatMap);
        }
    };

    init();
})();
