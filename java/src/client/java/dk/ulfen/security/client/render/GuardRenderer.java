package dk.ulfen.security.client.render;

import com.geckolib.constant.dataticket.DataTicket;
import com.geckolib.model.DefaultedEntityGeoModel;
import com.geckolib.renderer.GeoEntityRenderer;
import com.geckolib.renderer.base.GeoRenderState;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.entity.SecurityGuard;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;
import net.minecraft.resources.Identifier;
import org.jspecify.annotations.Nullable;

/** The security guard, with one of three skin tones. */
public class GuardRenderer extends GeoEntityRenderer<SecurityGuard, LivingEntityRenderState> {
	private static final DataTicket<Integer> VARIANT = DataTicket.create("secgear_variant", Integer.class);

	public GuardRenderer(EntityRendererProvider.Context context) {
		super(context, new Model());
		this.shadowRadius = 0.5F;
	}

	private static class Model extends DefaultedEntityGeoModel<SecurityGuard> {
		private final Identifier[] textures = new Identifier[SecurityGuard.VARIANTS];

		Model() {
			super(SecRegistry.id("security_guard"));
			for (int i = 0; i < textures.length; i++) textures[i] = SecRegistry.id("textures/entity/security_guard" + (i == 0 ? "" : "_skin" + i) + ".png");
		}

		@Override
		public Identifier getTextureResource(GeoRenderState state) {
			Integer v = state.getGeckolibData(VARIANT);
			return v != null && v > 0 && v < textures.length ? textures[v] : textures[0];
		}
	}

	@Override
	public void captureDefaultRenderState(SecurityGuard guard, @Nullable Void related, LivingEntityRenderState state, float partialTick) {
		super.captureDefaultRenderState(guard, related, state, partialTick);
		state.addGeckolibData(VARIANT, guard.getVariant());
	}
}
