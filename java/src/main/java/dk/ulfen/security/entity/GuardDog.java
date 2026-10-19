package dk.ulfen.security.entity;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.animation.AnimationController;
import com.geckolib.animation.RawAnimation;
import com.geckolib.animation.object.PlayState;
import com.geckolib.constant.DataTickets;
import com.geckolib.util.GeckoLibUtil;

import dk.ulfen.security.SecRegistry;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.AgeableMob;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.TamableAnimal;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.BreedGoal;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.FollowOwnerGoal;
import net.minecraft.world.entity.ai.goal.LeapAtTargetGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.SitWhenOrderedToGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.ai.goal.target.OwnerHurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.OwnerHurtTargetGoal;
import net.minecraft.world.entity.animal.wolf.WolfSoundVariant;
import net.minecraft.world.entity.animal.wolf.WolfSoundVariants;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

/**
 * A German shepherd. Tame it with bones; a tame guard dog follows you, sits on
 * command and goes for any hostile mob it sees.
 */
public class GuardDog extends TamableAnimal implements GeoEntity {
	private static final WolfSoundVariant.WolfSoundSet SOUNDS = SoundEvents.WOLF_SOUNDS.get(WolfSoundVariants.SoundSet.CLASSIC).adultSounds();
	private static final RawAnimation IDLE = RawAnimation.begin().thenLoop("animation.secgear.guard_dog.idle");
	private static final RawAnimation WALK = RawAnimation.begin().thenLoop("animation.secgear.guard_dog.walk");
	private static final RawAnimation RUN = RawAnimation.begin().thenLoop("animation.secgear.guard_dog.run");
	private static final RawAnimation SIT = RawAnimation.begin().thenLoop("animation.secgear.guard_dog.sit");
	private static final RawAnimation ATTACK = RawAnimation.begin().thenPlay("animation.secgear.guard_dog.attack");
	private final AnimatableInstanceCache cache = GeckoLibUtil.createInstanceCache(this);

	public GuardDog(EntityType<? extends GuardDog> type, Level level) {
		super(type, level);
	}

	public static AttributeSupplier.Builder createAttributes() {
		return createAnimalAttributes()
			.add(Attributes.MAX_HEALTH, 24.0)
			.add(Attributes.MOVEMENT_SPEED, 0.32)
			.add(Attributes.ATTACK_DAMAGE, 4.0)
			.add(Attributes.FOLLOW_RANGE, 20.0);
	}

	@Override
	protected void registerGoals() {
		this.goalSelector.addGoal(1, new FloatGoal(this));
		this.goalSelector.addGoal(2, new SitWhenOrderedToGoal(this));
		this.goalSelector.addGoal(4, new LeapAtTargetGoal(this, 0.4F));
		this.goalSelector.addGoal(5, new MeleeAttackGoal(this, 1.3, true));
		this.goalSelector.addGoal(6, new FollowOwnerGoal(this, 1.1, 10.0F, 2.0F));
		this.goalSelector.addGoal(7, new BreedGoal(this, 1.0));
		this.goalSelector.addGoal(8, new WaterAvoidingRandomStrollGoal(this, 1.0));
		this.goalSelector.addGoal(10, new LookAtPlayerGoal(this, Player.class, 8.0F));
		this.goalSelector.addGoal(10, new RandomLookAroundGoal(this));
		this.targetSelector.addGoal(1, new OwnerHurtByTargetGoal(this));
		this.targetSelector.addGoal(2, new OwnerHurtTargetGoal(this));
		this.targetSelector.addGoal(3, new HurtByTargetGoal(this));
		this.targetSelector.addGoal(4, new NearestAttackableTargetGoal<>(this, Mob.class, true, (target, level) -> this.isTame() && target instanceof Enemy));
	}

	@Override
	public InteractionResult mobInteract(Player player, InteractionHand hand) {
		ItemStack stack = player.getItemInHand(hand);
		if (this.isTame()) {
			if (this.isFood(stack) && this.getHealth() < this.getMaxHealth()) {
				if (!this.level().isClientSide()) {
					this.heal(6.0F);
					stack.consume(1, player);
				}
				return InteractionResult.SUCCESS;
			}
			if (this.isOwnedBy(player) && !this.isFood(stack)) {
				if (!this.level().isClientSide()) {
					this.setOrderedToSit(!this.isOrderedToSit());
					this.jumping = false;
					this.navigation.stop();
					this.setTarget(null);
				}
				return InteractionResult.SUCCESS;
			}
		} else if (stack.is(Items.BONE)) {
			if (!this.level().isClientSide()) {
				stack.consume(1, player);
				if (this.random.nextInt(3) == 0) {
					this.tame(player);
					this.navigation.stop();
					this.setTarget(null);
					this.setOrderedToSit(true);
					this.level().broadcastEntityEvent(this, (byte) 7);
				} else {
					this.level().broadcastEntityEvent(this, (byte) 6);
				}
			}
			return InteractionResult.SUCCESS;
		}
		return super.mobInteract(player, hand);
	}

	@Override
	public boolean isFood(ItemStack stack) {
		return stack.is(Items.BONE) || stack.is(Items.COOKED_BEEF) || stack.is(Items.BEEF);
	}

	@Override
	public @Nullable AgeableMob getBreedOffspring(ServerLevel level, AgeableMob partner) {
		GuardDog pup = SecRegistry.GUARD_DOG.create(level, EntitySpawnReason.BREEDING);
		if (pup != null && this.getOwner() instanceof Player owner) pup.tame(owner);
		return pup;
	}

	@Override
	protected @Nullable SoundEvent getAmbientSound() {
		return this.getTarget() != null ? SOUNDS.growlSound().value() : SOUNDS.ambientSound().value();
	}

	@Override
	protected @Nullable SoundEvent getHurtSound(DamageSource source) {
		return SOUNDS.hurtSound().value();
	}

	@Override
	protected @Nullable SoundEvent getDeathSound() {
		return SOUNDS.deathSound().value();
	}

	@Override
	public boolean wantsToAttack(LivingEntity target, LivingEntity owner) {
		return !(target instanceof TamableAnimal t && t.isTame()) && !(target instanceof Player);
	}

	@Override
	public void registerControllers(AnimatableManager.ControllerRegistrar controllers) {
		controllers.add(new AnimationController<GuardDog>("move", 4, state -> {
			GuardDog dog = state.animatable();
			if (dog.isInSittingPose()) return state.setAndContinue(SIT);
			Vec3 v = state.getDataOrDefault(DataTickets.VELOCITY, Vec3.ZERO);
			double speed = Math.sqrt(v.x * v.x + v.z * v.z) * 20;
			return state.setAndContinue(speed > 5 ? RUN : speed > 0.4 ? WALK : IDLE);
		}));
		controllers.add(new AnimationController<GuardDog>("attack", 1, state -> {
			if (state.animatable().isSwinging()) return state.setAndContinue(ATTACK);
			state.controller().reset();
			return PlayState.STOP;
		}));
	}

	@Override
	public AnimatableInstanceCache getAnimatableInstanceCache() {
		return cache;
	}
}
