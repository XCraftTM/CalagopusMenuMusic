use shared::{
    State,
    extensions::{Extension, ExtensionRouteBuilder},
};
use std::sync::Arc;

mod routes;
mod settings;

#[derive(Default)]
pub struct ExtensionStruct;

#[async_trait::async_trait]
impl Extension for ExtensionStruct {
    async fn initialize_router(
        &mut self,
        state: State,
        builder: ExtensionRouteBuilder,
    ) -> ExtensionRouteBuilder {
        builder
            .add_global_router(|routes| {
                routes.nest(
                    "/api/extensions/dev.xcrafttm.menumusic/config",
                    routes::public::router(&state),
                )
            })
            .add_admin_api_router(|routes| {
                routes.nest(
                    "/extensions/dev.xcrafttm.menumusic",
                    routes::admin::router(&state),
                )
            })
    }

    async fn settings_deserializer(
        &self,
        _state: State,
    ) -> shared::extensions::settings::ExtensionSettingsDeserializer {
        Arc::new(settings::ExtensionSettingsDataDeserializer)
    }
}
