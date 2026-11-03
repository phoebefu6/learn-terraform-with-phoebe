terraform {
  required_version = ">= 1.5.0"
  required_providers {
    local = { source = "hashicorp/local", version = ">= 2.4, < 3.0" }
  }
}

locals {
  name = "larkspur-${var.env}-${var.zone}"
}

resource "local_file" "marker" {
  filename = "${path.root}/lake/${local.name}/ZONE.txt"
  content  = "zone=${var.zone} env=${var.env} retention_days=${var.retention_days}\n"
}
