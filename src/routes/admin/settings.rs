use shared::State;
use utoipa_axum::{router::OpenApiRouter, routes};

mod get {
    use serde::Serialize;
    use shared::{
        GetState,
        models::user::GetPermissionManager,
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Serialize)]
    struct Response<'a> {
        #[schema(inline)]
        settings: &'a crate::settings::ExtensionSettingsData,
    }

    #[utoipa::path(get, path = "/", responses(
        (status = OK, body = inline(Response)),
    ))]
    pub async fn route(state: GetState, permissions: GetPermissionManager) -> ApiResponseResult {
        permissions.has_admin_permission("extensions.read")?;

        let settings = state.settings.get().await?;
        let settings: &crate::settings::ExtensionSettingsData =
            settings.find_extension_settings()?;

        ApiResponse::new_serialized(Response { settings }).ok()
    }
}

mod put {
    use serde::Serialize;
    use shared::{
        GetState,
        models::{admin_activity::GetAdminActivityLogger, user::GetPermissionManager},
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    use crate::settings::ExtensionSettingsData;

    #[derive(ToSchema, Serialize)]
    struct Response {
        #[schema(inline)]
        settings: ExtensionSettingsData,
    }

    #[utoipa::path(put, path = "/", responses(
        (status = OK, body = inline(Response)),
    ), request_body = inline(ExtensionSettingsData))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        activity_logger: GetAdminActivityLogger,
        shared::Payload(mut data): shared::Payload<ExtensionSettingsData>,
    ) -> ApiResponseResult {
        let errors = data.validate();
        if !errors.is_empty() {
            return ApiResponse::errors(errors).ok();
        }

        permissions.has_admin_permission("extensions.manage")?;

        data.normalize();

        let mut settings = state.settings.get_mut().await?;
        let extension_settings: &mut ExtensionSettingsData =
            settings.find_mut_extension_settings()?;
        *extension_settings = data.clone();
        settings.save().await?;

        activity_logger
            .log(
                "settings:extensions:update",
                serde_json::json!({
                    "extension": "dev.xcrafttm.menumusic",
                    "enabled": data.enabled,
                    "configured_pages": data
                        .tracks
                        .iter()
                        .map(|t| t.page.as_str())
                        .collect::<Vec<_>>(),
                    "sounds": data.sounds.len(),
                }),
            )
            .await;

        ApiResponse::new_serialized(Response { settings: data }).ok()
    }
}

pub fn router(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(get::route))
        .routes(routes!(put::route))
        .with_state(state.clone())
}
