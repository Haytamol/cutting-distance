import React from "react";

interface SvgViewerProps {
  svgContent: string | null; // The SVG content to display
  svgDetails: {
    cuttingDistance: number | null;
    otherMetrics?: { [key: string]: any }; // Add any other metrics here
  } | null; // The details about the SVG
}

const SvgViewer: React.FC<SvgViewerProps> = ({ svgContent, svgDetails }) => {
  return (
    <div className="svg-component">
      {/* SVG Rendering Section */}
      <div className="svg-viewer-display">
        {svgContent ? (
          <div
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <p>No SVG selected</p>
        )}
      </div>

      {/* SVG Details Section */}
      {svgDetails && (
        <div className="svg-details">
          <h3>SVG Details</h3>
          <div>
            Cutting Distance:{" "}
            {svgDetails.cuttingDistance !== null
              ? `${svgDetails.cuttingDistance.toFixed(2)} mm`
              : "Calculating..."}
          </div>
          {svgDetails.otherMetrics &&
            Object.entries(svgDetails.otherMetrics).map(([key, value]) => (
              <div key={key}>
                {key}: {value}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default SvgViewer;
