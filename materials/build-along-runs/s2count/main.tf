variable "zone_list" {
  type    = list(string)
  default = ["raw", "curated", "serving"]
}
resource "terraform_data" "by_index" {
  count = length(var.zone_list)
  input = var.zone_list[count.index]
}
resource "terraform_data" "by_key" {
  for_each = toset(var.zone_list)
  input    = each.key
}
