resource "terraform_data" "raw_zone" {
  input = {
    name   = "larkspur-prod-raw"
    region = "eu-central-1"
    tags   = "team=data,owner=platform"
  }
  triggers_replace = ["eu-central-1"]

  lifecycle {
    create_before_destroy = true
  }
}
