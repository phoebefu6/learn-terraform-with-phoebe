terraform {
  required_providers {
    local  = { source = "hashicorp/local", version = "~> 2.5" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

resource "random_id" "platform" {
  byte_length = 4
}

resource "local_file" "readme" {
  filename = "${path.module}/out/README.txt"
  content  = "Larkspur Freight data platform, build ${random_id.platform.hex}\n"
}
