Pod::Spec.new do |s|
  s.name           = 'LeanientFaceLandmarks'
  s.version        = '1.0.0'
  s.summary        = 'On-device facial landmark detection (Apple Vision) for Leanient.'
  s.description    = 'Detects face-contour landmarks with VNDetectFaceLandmarksRequest and returns normalized geometry. Runs entirely on device; no data leaves the phone.'
  s.author         = 'Leanient'
  s.homepage       = 'https://leanient.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
