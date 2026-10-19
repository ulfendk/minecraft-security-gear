package dk.ulfen.security.client.render;

import com.geckolib.model.DefaultedEntityGeoModel;
import com.geckolib.renderer.GeoEntityRenderer;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.entity.GuardDog;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;

public class GuardDogRenderer extends GeoEntityRenderer<GuardDog, LivingEntityRenderState> {
	public GuardDogRenderer(EntityRendererProvider.Context context) {
		super(context, new DefaultedEntityGeoModel<>(SecRegistry.id("guard_dog")));
		this.shadowRadius = 0.4F;
	}
}
