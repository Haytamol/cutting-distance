export const calculateSvgCuttingDistance = (svgContent: string): number => {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");

  let totalDistance = 0;

  // If there's no group element, fall back to the entire SVG document
  const group = svgDoc.querySelector("g") || svgDoc;

  // Handle path elements using getTotalLength
  const paths = group.querySelectorAll("path");
  paths.forEach((path) => {
    const length = path.getTotalLength();
    totalDistance += length;
  });

  // Handle circle elements manually (fixing the 0 radius issue)
  const circles = group.querySelectorAll("circle");
  circles.forEach((circle) => {
    const radius = parseFloat(circle.getAttribute("r") || "0");
    // const cx = circle.getAttribute("cx") || "0";
    // const cy = circle.getAttribute("cy") || "0";

    if (radius > 0) {
      const circumference = 2 * Math.PI * radius;
      totalDistance += circumference;
    } else {
      console.warn(`Circle found with zero or invalid radius: ${radius}`);
    }
  });

  // Handle rectangle elements manually
  const rects = group.querySelectorAll("rect");
  rects.forEach((rect) => {
    const width = parseFloat(rect.getAttribute("width") || "0");
    const height = parseFloat(rect.getAttribute("height") || "0");
    const rx = parseFloat(rect.getAttribute("rx") || "0");
    const ry = parseFloat(rect.getAttribute("ry") || "0");

    let perimeter;
    if (rx > 0 && ry > 0) {
      // Rounded rectangle
      const circlePerimeter = 2 * Math.PI * rx;
      const rectPerimeter = 2 * (width - 2 * rx) + 2 * (height - 2 * ry);
      perimeter = circlePerimeter + rectPerimeter;
    } else {
      // Regular rectangle
      perimeter = 2 * (width + height);
    }

    totalDistance += perimeter;
  });

  // Handle line elements manually
  const lines = group.querySelectorAll("line");
  lines.forEach((line) => {
    const x1 = parseFloat(line.getAttribute("x1") || "0");
    const y1 = parseFloat(line.getAttribute("y1") || "0");
    const x2 = parseFloat(line.getAttribute("x2") || "0");
    const y2 = parseFloat(line.getAttribute("y2") || "0");
    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

    totalDistance += length;
  });

  // Handle polyline elements manually
  const polylines = group.querySelectorAll("polyline");
  polylines.forEach((polyline) => {
    const points = polyline.getAttribute("points")?.trim().split(/\s+|,/);
    if (points) {
      for (let i = 0; i < points.length - 2; i += 2) {
        const x1 = parseFloat(points[i]);
        const y1 = parseFloat(points[i + 1]);
        const x2 = parseFloat(points[i + 2]);
        const y2 = parseFloat(points[i + 3]);
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        totalDistance += length;
      }
    }
  });

  return totalDistance;
};
