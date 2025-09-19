type RGBColor = [number,number,number]

export interface ColorPaletteResult{
    mainColor: RGBColor,
    palette:RGBColor[]
}

/// Calculates the Euclidean distance between 2 RGB colors
function calculateDistance(c1:RGBColor,c2:RGBColor){
    const dr = c1[0] - c2[0]
    const dg = c1[1] - c2[1]
    const db = c1[2] - c2[2]

    return dr * dr + dg * dg + db * db;
}

export async function extractColorsWithKMeans(image: HTMLImageElement, k: number): Promise<ColorPaletteResult>{
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')
    if (!context){
        throw new Error('Cound not get Canvas');
    }

    // Scale the image down
    const MAX_WIDTH = 100;
    const scale = MAX_WIDTH / image.width;
    canvas.width = MAX_WIDTH;
    canvas.height = image.height * scale;

    context.drawImage(image, 0, 0, canvas.width,canvas.height);

    // Get RGBARGBA
    const imageData = context.getImageData(0,0,canvas.width,canvas.height).data;
    const pixels: RGBColor[] = [];

    const PIXEL_SCAMPLE_RATE = 5;
    for (let i  = 0; i < imageData.length; i += 4 * PIXEL_SCAMPLE_RATE){     
        // Ignore transparent pixels
        if (imageData[i + 3] > 128){
            pixels.push([imageData[i],imageData[i+1],imageData[i+2]])
        }
    }

    if (pixels.length == 0){
        // Fallback when image not usable
        return {mainColor:[18,18,18],palette:[[50,50,50],[50,50,50],[50,50,50]]}
    }

    let centroids: RGBColor[] = [];
    const usedIndices = new Set<number>();
    // Place random k centroids
    while(centroids.length < k && centroids.length < pixels.length){
        const idx = Math.floor(Math.random() * pixels.length);
        if (!usedIndices.has(idx)){
            centroids.push(pixels[idx])
            usedIndices.add(idx);
        }
    }

    const ITER = 20;
    let clusters: RGBColor[][] = [];

    for (let iter = 0; iter < ITER; iter++){
        clusters = Array.from({length:k}, () => []);
        // Assign each pixel to closest centroid
        for (const pixel of pixels){
            let minDistance = Infinity;
            let closestCentroidIdx = 0;
            for (let i = 0; i < centroids.length; i++){
                const distance = calculateDistance(pixel, centroids[i]);
                if (distance < minDistance){
                    // Found a closer, update it
                    minDistance = distance;
                    closestCentroidIdx = i;
                }
            }
            clusters[closestCentroidIdx].push(pixel);
        }

        // Update, recalculate centroids as the average color of their cluster
        let converged = true;
        for (let i = 0; i < k; i++){
            if (clusters[i].length == 0){
                // Empty cluster
                continue;
            }
            const center: RGBColor = [0,0,0];
            for (const pixel of clusters[i]){
                center[0] += pixel[0];
                center[1] += pixel[1];
                center[2] += pixel[2];
            }
            // Mean as center
            const newCentroid: RGBColor = [Math.round(center[0] / clusters[i].length),Math.round(center[1] / clusters[i].length),Math.round(center[1] / clusters[i].length)]
        
            if (calculateDistance(newCentroid,centroids[i]) > 0.1){
                converged = false;
            }
            centroids[i] = newCentroid;
        }
        if (converged){
            // Stop if centroids are no longer changing
            break;
        }
    }

    const result = centroids.map((centroid,i) => ({
        color: centroid,
        size: clusters[i].length
    }));
    result.sort((a,b) => b.size - a.size);
    const mainColor = result[0]?.color || [18,18,18]
    const palette = result.slice(1).map(p => p.color);

    return {mainColor,palette};
}