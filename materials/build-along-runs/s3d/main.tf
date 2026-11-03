terraform {
  backend "local" {
    path = "state/larkspur-dev.tfstate"
  }
}

resource "terraform_data" "slow_load" {
  input = "nightly"
  provisioner "local-exec" {
    command = "sleep 6"
  }
}
