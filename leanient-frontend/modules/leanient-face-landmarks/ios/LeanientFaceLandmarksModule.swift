import ExpoModulesCore
import Vision
import UIKit

/**
 On-device facial landmark detection for Leanient's Phase 2b facial-volume
 tracking. Wraps Apple's Vision framework (`VNDetectFaceLandmarksRequest`) and
 returns the face-contour geometry as normalized, image-space points.

 Privacy: the image is read locally, analyzed on device, and only the derived
 contour points are returned to JavaScript. Nothing is uploaded; the JS layer
 turns these points into ratios and stores them in on-device storage.

 The returned shape matches the TypeScript `FaceLandmarks`:
   { contour: [{ x, y }], boundingBox: { x, y, width, height } }
 All values are normalized [0,1] in image space, origin top-left, y down.
 */
public class LeanientFaceLandmarksModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LeanientFaceLandmarks")

    AsyncFunction("detectFromImage") { (uri: String, promise: Promise) in
      guard
        let url = URL(string: uri),
        let data = try? Data(contentsOf: url),
        let image = UIImage(data: data),
        let cgImage = image.cgImage
      else {
        promise.resolve(nil)
        return
      }

      let request = VNDetectFaceLandmarksRequest { request, error in
        guard
          error == nil,
          let results = request.results as? [VNFaceObservation],
          // Largest face wins (closest to the camera in a face check).
          let face = results.max(by: { lhs, rhs in
            lhs.boundingBox.width * lhs.boundingBox.height < rhs.boundingBox.width * rhs.boundingBox.height
          }),
          let contour = face.landmarks?.faceContour
        else {
          promise.resolve(nil)
          return
        }

        // Vision: bounding box is normalized in image space, origin bottom-left,
        // y up. Landmark `normalizedPoints` are normalized within that box.
        let box = face.boundingBox

        let contourPoints: [[String: Double]] = contour.normalizedPoints.map { point in
          let imageX = box.origin.x + Double(point.x) * box.size.width
          let imageYBottomUp = box.origin.y + Double(point.y) * box.size.height
          return ["x": imageX, "y": 1.0 - imageYBottomUp]
        }

        let boundingBox: [String: Double] = [
          "x": box.origin.x,
          "y": 1.0 - (box.origin.y + box.size.height),
          "width": box.size.width,
          "height": box.size.height,
        ]

        promise.resolve(["contour": contourPoints, "boundingBox": boundingBox])
      }

      let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try handler.perform([request])
        } catch {
          promise.resolve(nil)
        }
      }
    }
  }
}
