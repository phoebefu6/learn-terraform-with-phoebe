terraform {
  required_providers {
    local = { source = "hashicorp/local", version = "~> 2.5" }
  }
}

locals {
  zones = {
    raw     = 30
    curated = 365
    serving = 90
  }
}

module "dev_zone" {
  source         = "./modules/data-zone"
  for_each       = local.zones
  env            = "dev"
  zone           = each.key
  retention_days = each.value
}

module "prod_zone" {
  source         = "./modules/data-zone"
  for_each       = local.zones
  env            = "prod"
  zone           = each.key
  retention_days = each.value
}

output "zone_names" {
  value = concat([for m in module.dev_zone : m.name], [for m in module.prod_zone : m.name])
}
