package dk.ulfen.security;

import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;

public class SecurityGear implements ModInitializer {
	public static final String MOD_ID = "secgear";

	@Override
	public void onInitialize() {
		SecRegistry.register();
		PayloadTypeRegistry.clientboundPlay().register(ViewCameraPayload.TYPE, ViewCameraPayload.CODEC);
	}
}
