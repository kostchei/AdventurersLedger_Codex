# TaleKeeper GCP Infrastructure Variables

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region - Use us-west1, us-central1, or us-east1 for free tier"
  type        = string
  default     = "us-central1"

  validation {
    condition     = contains(["us-west1", "us-central1", "us-east1"], var.region)
    error_message = "Region must be us-west1, us-central1, or us-east1 for Cloud Storage free tier."
  }
}

variable "api_domain" {
  description = "Custom domain for the API (e.g., api.talekeeper.org)"
  type        = string
  default     = "api.talekeeper.org"
}

variable "frontend_domain" {
  description = "Custom domain for the frontend (e.g., talekeeper.org)"
  type        = string
  default     = "talekeeper.org"
}

variable "enable_custom_domain" {
  description = "Whether to configure custom domain mapping"
  type        = bool
  default     = false
}

variable "enable_cloud_build" {
  description = "Whether to enable Cloud Build triggers for CI/CD"
  type        = bool
  default     = false
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = ""
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "AdventurersLedger_Codex"
}

# PocketBase Configuration
variable "pocketbase_version" {
  description = "PocketBase version to deploy"
  type        = string
  default     = "0.26.6"
}

variable "max_instances" {
  description = "Maximum Cloud Run instances (keep low for free tier)"
  type        = number
  default     = 2

  validation {
    condition     = var.max_instances <= 5
    error_message = "Keep max_instances <= 5 to stay within free tier limits."
  }
}

variable "container_memory" {
  description = "Container memory allocation"
  type        = string
  default     = "512Mi"

  validation {
    condition     = contains(["256Mi", "512Mi", "1Gi"], var.container_memory)
    error_message = "Memory must be 256Mi, 512Mi, or 1Gi for cost efficiency."
  }
}
