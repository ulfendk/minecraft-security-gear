package dk.ulfen.security.test;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.SecurityGear;
import dk.ulfen.security.block.BridgeWinchBlock;
import dk.ulfen.security.block.KeycardReaderBlock;
import dk.ulfen.security.block.LaserEmitterBlock;
import dk.ulfen.security.block.LaserReceiverBlock;
import dk.ulfen.security.block.MotionSensorBlock;
import dk.ulfen.security.block.PitTrapdoorBlock;
import dk.ulfen.security.block.TimedBombBlock;
import dk.ulfen.security.block.TripwireBombBlock;
import dk.ulfen.security.entity.SecurityGuard;
import dk.ulfen.security.structure.Blueprints;
import net.fabricmc.fabric.api.gametest.v1.GameTest;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.gametest.framework.GameTestHelper;
import net.minecraft.resources.Identifier;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;

/** Server-side checks run by `./gradlew runGameTest` (and in CI). */
public class SecGameTests {
	private static Mob still(GameTestHelper helper, net.minecraft.world.entity.EntityType<? extends Mob> type, BlockPos pos) {
		Mob mob = helper.spawn(type, pos);
		mob.setNoAi(true);
		mob.addEffect(new MobEffectInstance(MobEffects.RESISTANCE, 400, 4));
		return mob;
	}

	/** A pig standing in a laser beam makes the receiver at the far end give a signal. */
	@GameTest(maxTicks = 60)
	public void laserTripwirePowersReceiver(GameTestHelper helper) {
		helper.setBlock(new BlockPos(0, 1, 2), SecRegistry.LASER_EMITTER.defaultBlockState().setValue(LaserEmitterBlock.FACING, Direction.EAST));
		helper.setBlock(new BlockPos(6, 1, 2), SecRegistry.LASER_RECEIVER.defaultBlockState().setValue(LaserReceiverBlock.FACING, Direction.WEST));
		still(helper, EntityTypes.PIG, new BlockPos(3, 1, 2));
		helper.succeedWhen(() -> helper.assertBlockProperty(new BlockPos(6, 1, 2), LaserReceiverBlock.POWERED, true));
	}

	/** With nothing in the beam the receiver stays off; a redstone signal switches the emitter off. */
	@GameTest(maxTicks = 60)
	public void laserIdleAndSwitchedOff(GameTestHelper helper) {
		helper.setBlock(new BlockPos(0, 1, 2), SecRegistry.LASER_EMITTER.defaultBlockState().setValue(LaserEmitterBlock.FACING, Direction.EAST));
		helper.setBlock(new BlockPos(6, 1, 2), SecRegistry.LASER_RECEIVER.defaultBlockState().setValue(LaserReceiverBlock.FACING, Direction.WEST));
		helper.runAfterDelay(20, () -> {
			helper.assertBlockProperty(new BlockPos(6, 1, 2), LaserReceiverBlock.POWERED, false);
			helper.setBlock(new BlockPos(0, 1, 1), Blocks.REDSTONE_BLOCK);
		});
		helper.runAfterDelay(30, () -> {
			helper.assertBlockProperty(new BlockPos(0, 1, 2), LaserEmitterBlock.POWERED, true);
			still(helper, EntityTypes.PIG, new BlockPos(3, 1, 2));
		});
		helper.runAfterDelay(50, () -> {
			helper.assertBlockProperty(new BlockPos(6, 1, 2), LaserReceiverBlock.POWERED, false);
			helper.succeed();
		});
	}

	/** The blue laser fence burns whatever stands in it. */
	@GameTest(maxTicks = 80)
	public void laserFenceHurts(GameTestHelper helper) {
		helper.setBlock(new BlockPos(0, 1, 2), SecRegistry.LASER_FENCE.defaultBlockState().setValue(LaserEmitterBlock.FACING, Direction.EAST));
		Mob pig = helper.spawn(EntityTypes.PIG, new BlockPos(3, 1, 2));
		pig.setNoAi(true);
		float health = pig.getHealth();
		helper.succeedWhen(() -> helper.assertTrue(pig.getHealth() < health, "pig not hurt by the laser fence"));
	}

	/** A pit trapdoor drops a mob into the pit, then closes behind it. */
	@GameTest(maxTicks = 200)
	public void pitTrapdoorOpensAndCloses(GameTestHelper helper) {
		BlockPos trap = new BlockPos(3, 3, 3);
		for (int x = 2; x <= 4; x++) for (int z = 2; z <= 4; z++) for (int y = 1; y <= 3; y++) helper.setBlock(new BlockPos(x, y, z), Blocks.STONE);
		helper.setBlock(new BlockPos(3, 1, 3), Blocks.AIR);
		helper.setBlock(new BlockPos(3, 2, 3), Blocks.AIR);
		helper.setBlock(trap, SecRegistry.PIT_TRAPDOOR);
		Mob pig = helper.spawn(EntityTypes.PIG, new BlockPos(3, 4, 3));
		boolean[] opened = {false};
		helper.onEachTick(() -> {
			if (helper.getBlockState(trap).getValue(PitTrapdoorBlock.OPEN)) {
				if (!opened[0]) pig.setDeltaMovement(0, 0, 0);
				opened[0] = true;
			} else if (!opened[0]) {
				// Keep the pig walking about on the trapdoor until it gives way.
				net.minecraft.world.phys.Vec3 top = net.minecraft.world.phys.Vec3.atBottomCenterOf(helper.absolutePos(trap).above());
				if (pig.position().distanceTo(top) > 0.2) pig.snapTo(top.x, top.y, top.z);
				pig.setDeltaMovement(0.02, pig.getDeltaMovement().y, 0);
			}
		});
		helper.succeedWhen(() -> {
			helper.assertTrue(opened[0], "trapdoor never opened");
			helper.assertTrue(pig.getY() < helper.absolutePos(trap).getY(), "pig did not fall in");
			helper.assertBlockProperty(trap, PitTrapdoorBlock.OPEN, false);
		});
	}

	/** Powered, the winch lays deck up to the first obstacle; unpowered it winds it all back, leaving everything else alone. */
	@GameTest(maxTicks = 200)
	public void bridgeExtendsAndRetracts(GameTestHelper helper) {
		BlockPos winch = new BlockPos(0, 2, 2);
		helper.setBlock(winch, SecRegistry.BRIDGE_WINCH.defaultBlockState().setValue(BridgeWinchBlock.FACING, Direction.EAST));
		helper.setBlock(new BlockPos(7, 2, 2), Blocks.STONE);
		helper.setBlock(new BlockPos(0, 3, 2), Blocks.REDSTONE_BLOCK);
		int[] phase = {0};
		helper.onEachTick(() -> {
			int deck = 0;
			for (int x = 1; x <= 6; x++) if (helper.getBlockState(new BlockPos(x, 2, 2)).is(SecRegistry.BRIDGE_DECK)) deck++;
			if (phase[0] == 0 && deck == 6) {
				phase[0] = 1;
				helper.setBlock(new BlockPos(0, 3, 2), Blocks.AIR);
			} else if (phase[0] == 1 && deck == 0) {
				helper.assertBlockPresent(Blocks.STONE, new BlockPos(7, 2, 2));
				helper.succeed();
			}
		});
	}

	/** A reader set to Officer refuses a Guard card and accepts a Warden card. */
	@GameTest(maxTicks = 40)
	public void keycardReaderChecksClearance(GameTestHelper helper) {
		BlockPos pos = new BlockPos(2, 1, 2);
		helper.setBlock(pos, SecRegistry.KEYCARD_READER.defaultBlockState().setValue(KeycardReaderBlock.LEVEL, 2));
		BlockPos abs = helper.absolutePos(pos);
		KeycardReaderBlock reader = (KeycardReaderBlock) SecRegistry.KEYCARD_READER;
		helper.assertFalse(reader.swipe(helper.getLevel(), abs, helper.getBlockState(pos), null, 1), "guard card accepted");
		helper.assertBlockProperty(pos, KeycardReaderBlock.POWERED, false);
		helper.assertTrue(reader.swipe(helper.getLevel(), abs, helper.getBlockState(pos), null, 3), "warden card refused");
		helper.succeedWhen(() -> helper.assertBlockProperty(pos, KeycardReaderBlock.POWERED, true));
	}

	/** The motion sensor sees a pig in front of it. */
	@GameTest(maxTicks = 60)
	public void motionSensorSeesMob(GameTestHelper helper) {
		helper.setBlock(new BlockPos(1, 1, 1), SecRegistry.MOTION_SENSOR.defaultBlockState().setValue(MotionSensorBlock.FACING, Direction.EAST));
		still(helper, EntityTypes.PIG, new BlockPos(4, 1, 1));
		helper.succeedWhen(() -> helper.assertBlockProperty(new BlockPos(1, 1, 1), MotionSensorBlock.POWERED, true));
	}

	/** A guard goes after a zombie. */
	@GameTest(maxTicks = 200)
	public void guardTargetsZombie(GameTestHelper helper) {
		SecurityGuard guard = helper.spawn(SecRegistry.SECURITY_GUARD, new BlockPos(1, 1, 1));
		Mob zombie = still(helper, EntityTypes.ZOMBIE, new BlockPos(5, 1, 5));
		helper.succeedWhen(() -> helper.assertTrue(guard.getTarget() == zombie, "guard has not targeted the zombie"));
	}

	/** An armed bomb on a 5 second fuse goes off. */
	@GameTest(maxTicks = 200)
	public void timedBombExplodes(GameTestHelper helper) {
		BlockPos pos = new BlockPos(3, 1, 3);
		helper.setBlock(pos, SecRegistry.TIMED_BOMB.defaultBlockState().setValue(TimedBombBlock.TIMER, 0));
		TimedBombBlock.arm(helper.getLevel(), helper.absolutePos(pos), helper.getBlockState(pos), null);
		helper.runAfterDelay(80, () -> helper.assertBlockPresent(SecRegistry.TIMED_BOMB, pos));
		helper.succeedWhen(() -> helper.assertBlockNotPresent(SecRegistry.TIMED_BOMB, pos));
	}

	/** Walking through a tripwire bomb's wire sets it off. */
	@GameTest(maxTicks = 60)
	public void tripwireBombExplodes(GameTestHelper helper) {
		BlockPos pos = new BlockPos(1, 1, 3);
		helper.setBlock(pos, SecRegistry.TRIPWIRE_BOMB.defaultBlockState().setValue(TripwireBombBlock.FACING, Direction.EAST));
		still(helper, EntityTypes.PIG, new BlockPos(4, 1, 3));
		helper.succeedWhen(() -> helper.assertBlockNotPresent(SecRegistry.TRIPWIRE_BOMB, pos));
	}

	/** Every blueprint builds on open ground, and refuses to build into a wall. */
	@GameTest(maxTicks = 20)
	public void blueprintsBuild(GameTestHelper helper) {
		int x = 0;
		for (String name : Blueprints.names()) {
			// High above the test arena, where there is room for a whole tower.
			BlockPos base = helper.absolutePos(new BlockPos(4 + x, 1, 1)).above(80);
			int placed = Blueprints.build(helper.getLevel(), name, base, Direction.SOUTH);
			helper.assertTrue(placed > 20, name + " placed only " + placed + " blocks");
			helper.assertTrue(Blueprints.build(helper.getLevel(), name, base, Direction.SOUTH) == -1, name + " built into itself");
			x += 14;
		}
		helper.succeed();
	}

	/** Every block and item has a model, a name in both languages, and (blocks) a blockstate and loot table. */
	@GameTest(maxTicks = 1)
	public void everythingHasAssets(GameTestHelper helper) {
		JsonObject en = json("/assets/secgear/lang/en_us.json"), da = json("/assets/secgear/lang/da_dk.json");
		for (Block b : BuiltInRegistries.BLOCK) {
			Identifier id = BuiltInRegistries.BLOCK.getKey(b);
			if (!id.getNamespace().equals(SecurityGear.MOD_ID)) continue;
			helper.assertTrue(exists("/assets/secgear/blockstates/" + id.getPath() + ".json"), "no blockstate for " + id);
			helper.assertTrue(en.has(b.getDescriptionId()) && da.has(b.getDescriptionId()), "no name for " + id);
			if (b != SecRegistry.BRIDGE_DECK) helper.assertTrue(exists("/data/secgear/loot_table/blocks/" + id.getPath() + ".json"), "no loot table for " + id);
			for (BlockState s : b.getStateDefinition().getPossibleStates()) helper.assertTrue(s.getBlock() == b, "bad state");
		}
		for (Item i : BuiltInRegistries.ITEM) {
			Identifier id = BuiltInRegistries.ITEM.getKey(i);
			if (!id.getNamespace().equals(SecurityGear.MOD_ID)) continue;
			helper.assertTrue(exists("/assets/secgear/items/" + id.getPath() + ".json"), "no item model for " + id);
			helper.assertTrue(en.has(i.getDescriptionId()) && da.has(i.getDescriptionId()), "no name for " + id);
		}
		helper.succeed();
	}

	private static boolean exists(String path) {
		return SecurityGear.class.getResource(path) != null;
	}

	private static JsonObject json(String path) {
		try (InputStream in = SecurityGear.class.getResourceAsStream(path)) {
			return JsonParser.parseReader(new InputStreamReader(in, StandardCharsets.UTF_8)).getAsJsonObject();
		} catch (Exception e) {
			throw new IllegalStateException(path, e);
		}
	}
}
