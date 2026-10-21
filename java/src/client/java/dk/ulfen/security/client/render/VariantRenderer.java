package dk.ulfen.security.client.render;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.constant.dataticket.DataTicket;
import com.geckolib.model.DefaultedEntityGeoModel;
import com.geckolib.renderer.GeoEntityRenderer;
import com.geckolib.renderer.base.GeoRenderState;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.entity.HasVariant;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;
import net.minecraft.resources.Identifier;
import net.minecraft.world.entity.LivingEntity;
import org.jspecify.annotations.Nullable;

/**
 * A GeckoLib mob with texture variants: `<id>.png` for variant 0 and
 * `<id>_<suffix><n>.png` for the others (the guard's skins, the criminals' outfits).
 */
public class VariantRenderer<T extends LivingEntity & GeoEntity & HasVariant> extends GeoEntityRenderer<T, LivingEntityRenderState> {
	private static final DataTicket<Integer> VARIANT = DataTicket.create("secgear_variant", Integer.class);

	public VariantRenderer(EntityRendererProvider.Context context, String id, String suffix, int variants) {
		super(context, new Model<>(id, suffix, variants));
		this.shadowRadius = 0.5F;
	}

	private static class Model<T extends GeoEntity> extends DefaultedEntityGeoModel<T> {
		private final Identifier[] textures;

		Model(String id, String suffix, int variants) {
			super(SecRegistry.id(id));
			textures = new Identifier[variants];
			for (int i = 0; i < variants; i++) textures[i] = SecRegistry.id("textures/entity/" + id + (i == 0 ? "" : "_" + suffix + i) + ".png");
		}

		@Override
		public Identifier getTextureResource(GeoRenderState state) {
			Integer v = state.getGeckolibData(VARIANT);
			return v != null && v > 0 && v < textures.length ? textures[v] : textures[0];
		}
	}

	@Override
	public void captureDefaultRenderState(T entity, @Nullable Void related, LivingEntityRenderState state, float partialTick) {
		super.captureDefaultRenderState(entity, related, state, partialTick);
		state.addGeckolibData(VARIANT, entity.getVariant());
	}
}
