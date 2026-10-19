package dk.ulfen.security.client.mixin;

import dk.ulfen.security.client.CameraViewClient;
import net.minecraft.client.renderer.GameRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** No hand in front of the lens while looking through a security camera. */
@Mixin(GameRenderer.class)
public class GameRendererMixin {
	@Inject(method = "renderItemInHand", at = @At("HEAD"), cancellable = true)
	private void secgear$hideHandInCameraView(CallbackInfo ci) {
		if (CameraViewClient.active()) ci.cancel();
	}
}
