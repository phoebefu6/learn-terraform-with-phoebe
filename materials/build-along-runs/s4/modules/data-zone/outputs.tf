output "name" {
  value = local.name
}

output "path" {
  value = local_file.marker.filename
}
