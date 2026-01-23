# TaleKeeper GCP Infrastructure - Zero Cost Tier
# This Terraform configuration deploys PocketBase on Cloud Run
# with Cloud Storage for data persistence

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# =============================================================================
# Enable Required APIs
# =============================================================================

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
    "firebase.googleapis.com",
    "firebasehosting.googleapis.com",
    "iam.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}

# =============================================================================
# Cloud Storage Bucket for PocketBase Data
# =============================================================================

resource "google_storage_bucket" "pocketbase_data" {
  name     = "${var.project_id}-pocketbase-data"
  location = var.region

  # Use Standard storage class for free tier eligibility
  storage_class = "STANDARD"

  # Enable versioning for backup/recovery
  versioning {
    enabled = true
  }

  # Lifecycle rules to manage costs
  lifecycle_rule {
    condition {
      age = 30 # Delete old versions after 30 days
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 5 # Keep only 5 versions
    }
    action {
      type = "Delete"
    }
  }

  # Uniform bucket-level access
  uniform_bucket_level_access = true

  depends_on = [google_project_service.apis["storage.googleapis.com"]]
}

# =============================================================================
# Service Account for Cloud Run
# =============================================================================

resource "google_service_account" "cloud_run_sa" {
  account_id   = "talekeeper-cloudrun"
  display_name = "TaleKeeper Cloud Run Service Account"
  description  = "Service account for PocketBase on Cloud Run"

  depends_on = [google_project_service.apis["iam.googleapis.com"]]
}

# Grant Cloud Storage access to the service account
resource "google_storage_bucket_iam_member" "cloud_run_storage" {
  bucket = google_storage_bucket.pocketbase_data.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# =============================================================================
# Secret Manager for Sensitive Configuration
# =============================================================================

resource "google_secret_manager_secret" "pb_encryption_key" {
  secret_id = "pocketbase-encryption-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

# Note: You need to add the secret version manually or via CLI:
# gcloud secrets versions add pocketbase-encryption-key --data-file=-

# Grant Cloud Run access to secrets
resource "google_secret_manager_secret_iam_member" "cloud_run_secrets" {
  secret_id = google_secret_manager_secret.pb_encryption_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# =============================================================================
# Artifact Registry for Docker Images
# =============================================================================

resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "talekeeper"
  description   = "Docker repository for TaleKeeper images"
  format        = "DOCKER"

  # Cleanup policies to stay within free tier
  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 3
    }
  }

  depends_on = [google_project_service.apis["artifactregistry.googleapis.com"]]
}

# =============================================================================
# Cloud Run Service for PocketBase
# =============================================================================

resource "google_cloud_run_v2_service" "pocketbase" {
  name     = "talekeeper-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run_sa.email

    scaling {
      min_instance_count = 0 # Scale to zero for cost savings
      max_instance_count = 2 # Limit to stay within free tier
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/talekeeper/pocketbase:latest"

      # Resource limits (minimal for free tier)
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true # Don't charge for idle CPU
        startup_cpu_boost = true # Faster cold starts
      }

      # PocketBase port
      ports {
        container_port = 8090
      }

      # Environment variables
      env {
        name  = "GCS_BUCKET"
        value = google_storage_bucket.pocketbase_data.name
      }

      env {
        name  = "LITESTREAM_REPLICA_URL"
        value = "gcs://${google_storage_bucket.pocketbase_data.name}/litestream"
      }

      # Health check endpoint
      startup_probe {
        http_get {
          path = "/api/health"
          port = 8090
        }
        initial_delay_seconds = 5
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/api/health"
          port = 8090
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 30
      }
    }

    # Timeout settings
    timeout = "300s"

    # Use second-generation execution environment
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
  }

  # Traffic routing
  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_artifact_registry_repository.docker_repo,
  ]
}

# Allow unauthenticated access (PocketBase handles its own auth)
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  name     = google_cloud_run_v2_service.pocketbase.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# =============================================================================
# Domain Mapping for Custom Domain
# =============================================================================

resource "google_cloud_run_domain_mapping" "api_domain" {
  count    = var.enable_custom_domain ? 1 : 0
  name     = var.api_domain
  location = var.region

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.pocketbase.name
  }

  depends_on = [google_cloud_run_v2_service.pocketbase]
}

# =============================================================================
# Firebase Hosting for Frontend
# =============================================================================

resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [google_project_service.apis["firebase.googleapis.com"]]
}

resource "google_firebase_hosting_site" "default" {
  provider = google-beta
  project  = var.project_id
  site_id  = var.project_id

  depends_on = [google_firebase_project.default]
}

# Custom domain for Firebase Hosting
resource "google_firebase_hosting_custom_domain" "frontend" {
  count    = var.enable_custom_domain ? 1 : 0
  provider = google-beta
  project  = var.project_id
  site_id  = google_firebase_hosting_site.default.site_id

  custom_domain = var.frontend_domain
  wait_dns_verification = false

  depends_on = [google_firebase_hosting_site.default]
}

# =============================================================================
# Cloud Build Trigger for CI/CD (Optional)
# =============================================================================

resource "google_cloudbuild_trigger" "deploy_trigger" {
  count    = var.enable_cloud_build ? 1 : 0
  name     = "talekeeper-deploy"
  location = var.region

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^main$"
    }
  }

  filename = "cloudbuild.yaml"

  depends_on = [google_project_service.apis["cloudbuild.googleapis.com"]]
}
