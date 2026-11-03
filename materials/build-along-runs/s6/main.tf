terraform {
  required_providers {
    local = { source = "hashicorp/local", version = "~> 2.5" }
  }
}
resource "local_file" "zone" {
  for_each = toset(["raw", "curated", "serving"])
  filename = "${path.module}/lake/larkspur-${terraform.workspace}-${each.key}/ZONE.txt"
  content  = "zone=${each.key} env=${terraform.workspace}\n"
}
