package dk.ulfen.security.client;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.ViewCameraPayload;
import dk.ulfen.security.client.feed.FeedManager;
import dk.ulfen.security.client.feed.FeedRaycaster;
import dk.ulfen.security.client.render.CameraRenderer;
import dk.ulfen.security.client.render.GuardDogRenderer;
import dk.ulfen.security.client.render.LaserRenderer;
import dk.ulfen.security.client.render.MonitorRenderer;
import dk.ulfen.security.client.render.SearchlightRenderer;
import dk.ulfen.security.client.render.VariantRenderer;
import dk.ulfen.security.entity.Criminal;
import dk.ulfen.security.entity.SecurityGuard;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.fabricmc.fabric.api.client.rendering.v1.BlockEntityRendererRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.minecraft.client.renderer.entity.EntityRenderers;
import net.minecraft.client.renderer.entity.NoopRenderer;

public class SecurityGearClient implements ClientModInitializer {
	@Override
	public void onInitializeClient() {
		BlockEntityRendererRegistry.register(SecRegistry.CAMERA_BE, CameraRenderer::new);
		BlockEntityRendererRegistry.register(SecRegistry.SEARCHLIGHT_BE, SearchlightRenderer::new);
		BlockEntityRendererRegistry.register(SecRegistry.MONITOR_BE, MonitorRenderer::new);
		BlockEntityRendererRegistry.register(SecRegistry.LASER_BE, LaserRenderer::new);
		EntityRenderers.register(SecRegistry.SECURITY_GUARD, ctx -> new VariantRenderer<>(ctx, "security_guard", "skin", SecurityGuard.VARIANTS));
		EntityRenderers.register(SecRegistry.CRIMINAL, ctx -> new VariantRenderer<>(ctx, "criminal", "outfit", Criminal.VARIANTS));
		EntityRenderers.register(SecRegistry.GUARD_DOG, GuardDogRenderer::new);
		EntityRenderers.register(SecRegistry.CAMERA_VIEW, NoopRenderer::new);

		ClientPlayNetworking.registerGlobalReceiver(ViewCameraPayload.TYPE, (payload, context) -> CameraViewClient.start(payload));
		ClientTickEvents.END_CLIENT_TICK.register(mc -> {
			CameraViewClient.tick(mc);
			FeedManager.tick(mc);
		});
		HudElementRegistry.addLast(SecRegistry.id("camera_view"), CameraViewClient::hud);
	}

	static {
		// Texture reloads replace the sprites the live feed samples from.
		net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientLifecycleEvents.CLIENT_STARTED.register(mc -> FeedRaycaster.clearCache());
	}
}
