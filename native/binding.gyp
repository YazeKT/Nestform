{
  "targets": [
    {
      "target_name": "nestform",
      "sources": [
        "addon.cc"
      ],
      "include_dirs": [
        "<!(node -p \"require('node-addon-api').include_dir\")",
        "../vendor/boost_1_62_0"
      ],
      "defines": [
        "NAPI_CPP_EXCEPTIONS",
        "NAPI_VERSION=8",
        "_HAS_AUTO_PTR_ETC=1"
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": [
            "/std:c++17",
            "/bigobj"
          ]
        }
      },
      "cflags_cc": [
        "-std=c++17",
        "-fexceptions"
      ]
    }
  ]
}
