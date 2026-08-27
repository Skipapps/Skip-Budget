Pod::Spec.new do |s|
  s.name           = 'ReceiptScanner'
  s.version        = '1.0.0'
  s.summary        = 'Document scanning and text recognition through Apple Vision.'
  s.license        = 'MIT'
  s.author         = ''
  s.homepage       = 'https://skipapps.net'
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
