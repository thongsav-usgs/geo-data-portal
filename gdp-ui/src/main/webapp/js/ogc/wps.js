// JSLint fixes
/*jslint plusplus: true */
/*global $ */
/*global logger */
var WPS = function () {
    function createWpsExecuteXML(wpsAlgorithm, stringInputs, xmlInputs, outputs, async, rawOutput, mimeType) {
        var xml =
			'<?xml version="1.0" encoding="UTF-8"?>' +
            '<wps:Execute service="WPS" version="1.0.0" ' +
			'xmlns:wps="http://www.opengis.net/wps/1.0.0" ' +
			'xmlns:ows="http://www.opengis.net/ows/1.1" ' +
			'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
			'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
			'xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 ' +
			'http://schemas.opengis.net/wps/1.0.0/wpsExecute_request.xsd">' +
			'<ows:Identifier>' + wpsAlgorithm + '</ows:Identifier>' +
			'<wps:DataInputs>',
			stringProp,
			stringPropIdx,
			xmlInputIdx,
			xmlProp,
			outputsIdx;

		for	(stringProp in stringInputs) {
			if (stringInputs.hasOwnProperty(stringProp)) {
				for (stringPropIdx = 0; stringPropIdx < stringInputs[stringProp].length; stringPropIdx++) {
					xml +=
						'<wps:Input>' +
						'<ows:Identifier>' + stringProp + '</ows:Identifier>' +
						'<wps:Data>' +
						'<wps:LiteralData>' + stringInputs[stringProp][stringPropIdx] + '</wps:LiteralData>' +
						'</wps:Data>' +
						'</wps:Input>';
				}
			}
        }

        for (xmlProp in xmlInputs) {
			if (xmlInputs.hasOwnProperty(xmlProp)) {
				for (xmlInputIdx = 0; xmlInputIdx < xmlInputs[xmlProp].length; xmlInputIdx++) {
					xml +=
						'<wps:Input>' + 
						'<ows:Identifier>' + xmlProp + '</ows:Identifier>' +
						xmlInputs[xmlProp][xmlInputIdx] +
						'</wps:Input>';
				}
			}
        }

        xml +=
			'</wps:DataInputs>' +
			'<wps:ResponseForm>';

        var mimeTypeAttr = (mimeType) ? ' mimeType="' + mimeType + '"' : '';
		if (rawOutput) {
			xml += '<wps:RawDataOutput' + mimeTypeAttr + '>';
            xml += '<ows:Identifier>' + outputs[0] + '</ows:Identifier>';
			xml += '</wps:RawDataOutput>';
		} else {
            xml +=     '<wps:ResponseDocument' + (async ? ' storeExecuteResponse="true" status="true"' : '') + '>';
			for (outputsIdx = 0; outputsIdx < outputs.length; outputsIdx++) {
				xml +=
					'<wps:Output' + (async ? ' asReference="true"' : '') + mimeTypeAttr +'>' +
					'<ows:Identifier>' + outputs[outputsIdx] + '</ows:Identifier>' +
					'</wps:Output>';
			}
			xml += '</wps:ResponseDocument>';
		}

        xml += '</wps:ResponseForm></wps:Execute>';

        return xml;
    }

    // Public members and methods
    return {
        init: function() {
            // Warm up the OGC proxy by making a getting the GetCaps from the process 
            // wps server
            // TODO- memoize the valid response so we don't make multiple calls
            var wpsURL = Constant.endpoint.proxy + Constant.endpoint.processwps;
            WPS.sendWPSGetRequest(wpsURL, WPS.getCapabilitiesParams, false, function() {
            });
        },
        getCapabilitiesParams: {
            'Request' : 'GetCapabilities',
            'Service' : 'WPS',
            'Version' : '1.0.0'
        },
        describeProcessParams: function (processID) {
            return {
                'Request' : 'DescribeProcess',
                'Service' : 'WPS',
                'Identifier' : processID,
                'Version' : '1.0.0'
            };
        },
        processDescriptions: {},

        // Inputs should be an object with the key equaling the input identifier, and
        // the value equaling an array of data. Each value is required to be an array
        // so that all properties can be handled identically when creating the xml.
        sendWpsExecuteRequest: function (wpsEndpoint, wpsAlgorithm, stringInputs, outputs, async, callback, xmlInputs, rawOutput, dataType, mimeType) {

			var ajaxInputs = {
                url : wpsEndpoint,
                type : 'post',
                data : createWpsExecuteXML(wpsAlgorithm, stringInputs, xmlInputs, outputs, async, rawOutput, mimeType),
                processData : false,
                dataType : dataType || 'xml',
                contentType : 'text/xml',
                success : function (data, textStatus, XMLHttpRequest) {
                    callback(data);
                }
            };

            logger.debug('GDP: Sending WPS Execute request for algorithm: ' + wpsAlgorithm);
            $.ajax(ajaxInputs);
        },

        sendWPSGetRequest: function (url, data, async, callback) {
            logger.debug("GDP:wps.js::Sending WPS GET request to: " + url);
            $.ajax({
                url : url,
                type : 'get',
                data : data,
                async : async,
                contentType : 'text/xml',
                success : function (data, textStatus, XMLHttpRequest) {
                    callback(data);
                }
            });
        },

        // Creates the wps:Reference element which holds the WFS request
        createWfsWpsReference: function (wfsEndpoint, wfsXML) {
            var xml =
				'<wps:Reference xlink:href="' + wfsEndpoint + '">' +
				'<wps:Body>' +
				wfsXML +
				'</wps:Body>' +
				'</wps:Reference>';

            return xml;
        },
        checkWpsResponse: function (response, message) {
            var success = $(response).find('ns|ExecuteResponse'),
				error,
				cause;

            if (success.length > 0) {
                return true;
            } else {
                error = $(response).find('ns|Exception');

                if (error.length > 0) {
                    cause = $(response).find('ns|Exception[exceptionCode="JAVA_RootCause"] > ns|ExceptionText:eq(0)').text();
                    message += ' Cause: ' + cause;
                }

                showErrorNotification(message);
                hideThrobber();
                logger.error("GDP: A WPS error was encountered: " + message);
                return false;
            }
        },
        createGeoserverBoundingBoxWPSRequest : function (wfsXML) {
            var wpsExecuteRequest = '';
            if (wfsXML) {
				wpsExecuteRequest += '<?xml version="1.0" encoding="UTF-8"?>' +
					'<wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">' +
					'<ows:Identifier>gs:Bounds</ows:Identifier>' +
					'<wps:DataInputs>' +
					'<wps:Input>' +
					'<ows:Identifier>features</ows:Identifier>' +
					// NOTE: need to use special 'geoserver internal' href to avoid schema lock noticed with GeoServer 2.2.5
					//  '<wps:Reference mimeType="application/wfs-collection-1.1" xlink:href="' + Constant.endpoint.wfs + '" method="POST">' +
					'<wps:Reference mimeType="application/wfs-collection-1.1" xlink:href="http://geoserver/wfs" method="POST">' +
					'<wps:Body>' +
					wfsXML +
					'</wps:Body>' +
					'</wps:Reference>' +
					'</wps:Input>' +
					'</wps:DataInputs>' +
					'<wps:ResponseForm>' +
					'<wps:RawDataOutput>' +
					'<ows:Identifier>bounds</ows:Identifier>' +
					'</wps:RawDataOutput>' +
					'</wps:ResponseForm>' +
					'</wps:Execute>';
			}
            return wpsExecuteRequest;
        }
    };
};
