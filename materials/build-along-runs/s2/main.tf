terraform {
  required_providers {
    local = { source = "hashicorp/local", version = "~> 2.5" }
  }
}

variable "env" {
  type        = string
  description = "Which environment to lay out"
  default     = "dev"
  validation {
    condition     = contains(["dev", "prod"], var.env)
    error_message = "env must be dev or prod."
  }
}

variable "zones" {
  type = map(object({
    retention_days = number
  }))
  default = {
    raw     = { retention_days = 30 }
    curated = { retention_days = 365 }
    serving = { retention_days = 90 }
  }
}

variable "warehouse_password" {
  type      = string
  sensitive = true
  default   = "not-a-real-secret"
}

locals {
  prefix = "larkspur-${var.env}"
}

resource "local_file" "zone" {
  for_each = var.zones
  filename = "${path.module}/lake/${local.prefix}-${each.key}/ZONE.txt"
  content  = "zone=${each.key} env=${var.env} retention_days=${each.value.retention_days}\n"
}

data "local_file" "raw_marker" {
  filename = local_file.zone["raw"].filename
}

output "zone_paths" {
  value = { for k, f in local_file.zone : k => f.filename }
}

output "raw_marker_text" {
  value = trimspace(data.local_file.raw_marker.content)
}

output "warehouse_password" {
  value     = var.warehouse_password
  sensitive = true
}
