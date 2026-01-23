# TaleKeeper GCP Infrastructure Outputs

output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.pocketbase.uri
}

output "cloud_run_service_name" {
  description = "Cloud Run service name"
  value       = google_cloud_run_v2_service.pocketbase.name
}

output "storage_bucket_name" {
  description = "Cloud Storage bucket for PocketBase data"
  value       = google_storage_bucket.pocketbase_data.name
}

output "storage_bucket_url" {
  description = "Cloud Storage bucket URL"
  value       = google_storage_bucket.pocketbase_data.url
}

output "artifact_registry_url" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
}

output "service_account_email" {
  description = "Cloud Run service account email"
  value       = google_service_account.cloud_run_sa.email
}

output "firebase_hosting_site" {
  description = "Firebase Hosting site ID"
  value       = google_firebase_hosting_site.default.site_id
}

output "firebase_hosting_url" {
  description = "Firebase Hosting default URL"
  value       = "https://${google_firebase_hosting_site.default.site_id}.web.app"
}

output "custom_domain_status" {
  description = "Custom domain mapping status"
  value       = var.enable_custom_domain ? "Enabled - configure DNS records" : "Disabled"
}

# DNS Configuration Instructions
output "dns_instructions" {
  description = "Instructions for configuring Cloudflare DNS"
  value       = <<-EOT

    ====== DNS Configuration for Cloudflare ======

    1. API Domain (${var.api_domain}):
       Type: CNAME
       Name: api
       Target: ${google_cloud_run_v2_service.pocketbase.uri}
       Proxy: ON (orange cloud)

    2. Frontend Domain (${var.frontend_domain}):
       Type: A
       Name: @
       Target: 199.36.158.100 (Firebase Hosting)
       Proxy: ON (orange cloud)

       Type: TXT
       Name: @
       Value: firebase=${var.project_id}

    3. www subdomain:
       Type: CNAME
       Name: www
       Target: ${var.frontend_domain}
       Proxy: ON (orange cloud)

    =============================================
  EOT
}

# Cost Estimate
output "estimated_monthly_cost" {
  description = "Estimated monthly cost within free tier"
  value       = "$0 (within GCP Always Free tier limits)"
}
