var OCR = {

    letters : [],

    recognize: function(image) {

        OCR.letters = [];

        var ratio = Math.round(10 * image.width / image.height);
        var x, y, w, h;
        switch (ratio) {
            case 8 :
                // 8 : ipad Portrait
                x = 100;
                y = 354;
                w = 570;
                h = 570;
                break;
            case 7 :
                // 7 : iPhone 4
                x = 0;
                y = 320;
                w = 640;
                h = 640;
                break;
            case 6 :
                // 6 : iPhone 5
                x = 0;
                y = 496;
                w = 640;
                h = 640;
                break;
        }

        var canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 640;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(image, x, y, w, h, 0, 0, 640, 640);
        // document.body.appendChild(canvas);

        //Convert to grayscale
        var pixels = ctx.getImageData(0,0,640,640);
        ctx.putImageData(OCR.grayscale(pixels), 0, 0);

        var inc = Math.round(canvas.width / 5); // 5x5 grid
        var letterCanvas;
        var bounds;
        var best_letter = 0;
        var max_distance = 1000;
        var hist;

        for (var i = 0; i < canvas.width; i+=inc) {
            for (var j = 0; j < canvas.height; j+=inc) {

                best_letter = '';
                max_distance = Infinity;

                // Isolate letter
                sourceCanvas = document.createElement('canvas');
                sourceCanvas.width = inc;
                sourceCanvas.height = inc;
                sourceCanvas.getContext('2d').drawImage(canvas, j, i, inc, inc, 0, 0, inc, inc);
                // Autocrop white margins
                bounds = OCR.autocrop(sourceCanvas);
                // console.log(bounds);

                // Downscale to 16x16
                letterCanvas = document.createElement('canvas');
                letterCanvas.width = 16;
                letterCanvas.height = 16;
                largestDimension = Math.max((bounds.bottom-bounds.top), (bounds.right-bounds.left));
                letterCanvas.getContext('2d').drawImage(
                    sourceCanvas,
                    bounds.left, bounds.top,
                    bounds.right-bounds.left,bounds.bottom-bounds.top,
                    0, 0,
                    16, 16
                );
                // document.body.appendChild(letterCanvas);

                // Search closest match by "histogram"
                hist = OCR.histogram(letterCanvas);
                for (var letter in training) {
                    distance = OCR.histogram_distance(hist, training[letter]);
                    if (distance < max_distance) {
                        max_distance = distance;
                        best_letter = letter;
                    }
                }
                OCR.letters.push(best_letter);
            }
        }
        return OCR.letters;
    },

    /**
     * Convert pixels to grayscale
     */
    grayscale : function(pixels) {
        var d = pixels.data;
        for (var i=0; i<d.length; i+=4) {
            var r = d[i];
            var g = d[i+1];
            var b = d[i+2];
            var v = OCR.rgb2value(r,g,b);
            if (v < 100) {
                v = 0;
            } else {
                v = 255;
            }
            d[i] = d[i+1] = d[i+2] = v;
        }
        return pixels;
    },

    /**
     * Convert RGB to value
     */
    rgb2value : function(r, g, b) {
        return 0.2126*r + 0.7152*g + 0.0722*b;
    },

    /**
     * Autocrop a canvas by removing useless margins
     */
    autocrop : function(canvas) {
        var threshold = 10;
        var ctx = canvas.getContext('2d');
        var pixels = ctx.getImageData(0,0,canvas.width,canvas.height);
        var topleft = OCR.rgb2value(pixels.data[0], pixels.data[1], pixels.data[2]);
        var bounds = {
            top: 0,
            right: canvas.width,
            bottom: canvas.height,
            left: 0
        };

        //crop top
        var idx;
        var v;
        var x,y;
        topScan:
        for (y=0; y<canvas.height; y++) {
            for (x=0; x<canvas.width; x++) {
                idx = (x + y * canvas.width) * 4;
                v = OCR.rgb2value(pixels.data[idx], pixels.data[idx+1], pixels.data[idx+2]);
                if (Math.abs(topleft - v) > threshold) {
                    break topScan;
                }
            }
        }
        bounds.top = y;

        //crop bottom
        bottomScan:
        for (y = (canvas.height - 1); y>1; --y) {
            for (x=0; x<canvas.width; x++) {
                idx = (x + y * canvas.width) * 4;
                v = OCR.rgb2value(pixels.data[idx], pixels.data[idx+1], pixels.data[idx+2]);
                if (Math.abs(topleft - v) > threshold) {
                    break bottomScan;
                }
            }
        }
        bounds.bottom = y;

        //crop left
        leftScan:
        for (x=0; x<canvas.width; x++) {
            for (y=0; y<canvas.height; y++) {
                idx = (x + y * canvas.width) * 4;
                v = OCR.rgb2value(pixels.data[idx], pixels.data[idx+1], pixels.data[idx+2]);
                if (Math.abs(topleft - v) > threshold) {
                    break leftScan;
                }
            }
        }
        bounds.left = x;

        //crop right
        rightScan:
        for (x = (canvas.width - 1); x>1; --x) {
            for (y=0; y<canvas.height; y++) {
                idx = (x + y * canvas.width) * 4;
                v = OCR.rgb2value(pixels.data[idx], pixels.data[idx+1], pixels.data[idx+2]);
                if (Math.abs(topleft - v) > threshold) {
                    break rightScan;
                }
            }
        }
        bounds.right = x;
        return bounds;
    },

    /**
     * Generate "histogram" values
     */
    histogram : function(canvas) {
        var threshold = 128;
        var ctx = canvas.getContext('2d');
        var pixels = ctx.getImageData(0,0,canvas.width,canvas.height);
        var hv = [];

        for (x=0; x<canvas.width; x++) {
            hv[x] = 0;
            for (y=0; y<canvas.height; y++) {
                idx = (x + y * canvas.width) * 4;
                v = OCR.rgb2value(pixels.data[idx], pixels.data[idx+1], pixels.data[idx+2]);
                if (v < threshold) {
                    hv[x]++;
                }
            }
        }
        return hv;
    },

    /**
     * Compute distance between 2 histograms
     */
    histogram_distance : function(h1, h2) {
        if (h1.length != h2.length) {
            return;
        }
        var diff = 0;
        for (var i = 0; i < h1.length; i++) {
            diff += Math.abs(h1[i] - h2[i]);
        }
        return diff;
    }
};

