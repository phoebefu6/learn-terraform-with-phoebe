variable "env" {
  type        = string
  description = "Environment name, dev or prod"
}

variable "zone" {
  type        = string
  description = "raw, curated or serving"
}

variable "retention_days" {
  type        = number
  description = "How long files stay in the zone"
  default     = 30
}
