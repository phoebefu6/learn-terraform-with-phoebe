terraform {
  required_providers {
    local = { source = "hashicorp/local", version = "~> 2.5" }
  }
}

variable "zones" {
  type    = set(string)
  default = ["raw", "curated", "serving"]
}

resource "local_file" "lake_zone" {
  for_each = var.zones
  filename = "${path.module}/lake/larkspur-dev-${each.key}/ZONE.txt"
  content  = "zone=${each.key} env=dev\n"
}

moved {
  from = local_file.zone
  to   = local_file.lake_zone
}
