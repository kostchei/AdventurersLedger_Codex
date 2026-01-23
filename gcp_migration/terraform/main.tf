provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

resource "google_compute_instance" "pocketbase_vm" {
  name         = "pocketbase-vm"
  machine_type = var.machine_type
  zone         = var.zone

  tags = ["http-server", "https-server", "ssh"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 30
      type  = "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {
      // Ephemeral public IP
    }
  }

  metadata_startup_script = <<-EOF
    #! /bin/bash
    # Install Docker and Docker Compose
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
  EOF
}
