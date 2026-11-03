resource "random_id" "lake_suffix" {
  byte_length = 4
}

import {
  to = random_id.lake_suffix
  id = "BNLpvQ"
}
