output "instance_ip" {
  description = "The public IP address of the PocketBase instance"
  value       = google_compute_instance.pocketbase_vm.network_interface.0.access_config.0.nat_ip
}
