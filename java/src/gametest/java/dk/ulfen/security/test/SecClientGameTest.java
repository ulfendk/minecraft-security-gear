package dk.ulfen.security.test;

import java.util.List;

import com.mojang.blaze3d.platform.NativeImage;

import dk.ulfen.security.ViewCameraPayload;
import dk.ulfen.security.blockentity.CameraBlockEntity;
import dk.ulfen.security.blockentity.MonitorBlockEntity;
import dk.ulfen.security.client.CameraViewClient;
import dk.ulfen.security.structure.Blueprints;
import net.fabricmc.fabric.api.client.gametest.v1.FabricClientGameTest;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestSingleplayerContext;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;

/**
 * Starts a real client and checks the live monitor feed, then takes screenshots of
 * the gear (run with `./gradlew runClientGameTest`; images land in
 * build/run/clientGameTest/screenshots).
 */
public class SecClientGameTest implements FabricClientGameTest {
	@Override
	public void runTest(ClientGameTestContext context) {
		try (TestSingleplayerContext world = context.worldBuilder().create()) {
			var server = world.getServer();
			server.runCommand("gamerule advance_time false");
			server.runCommand("gamerule spawn_mobs false");
			server.runCommand("time set noon");
			server.runCommand("weather clear");
			context.waitTicks(20);

			// A camera looking at a red wall with a yellow stripe, and a monitor showing it.
			BlockPos cam = new BlockPos(0, -58, 2);
			BlockPos monitor = new BlockPos(0, -60, -3);
			server.runCommand("fill -6 -60 9 6 -54 9 red_wool");
			server.runCommand("fill -6 -58 9 6 -58 9 yellow_wool");
			server.runCommand("setblock 0 -58 1 stone");
			server.runCommand("setblock 0 -58 2 secgear:security_camera[facing=south]");
			server.runCommand("setblock 0 -60 -3 secgear:monitor[facing=north]");
			server.runOnServer(s -> {
				var level = s.overworld();
				if (level.getBlockEntity(cam) instanceof CameraBlockEntity c) c.setStill(true);
				if (level.getBlockEntity(monitor) instanceof MonitorBlockEntity m) m.link(List.of(cam));
			});
			server.runCommand("tp @p 0.5 -60 -5.2 0 25");
			context.waitTicks(60);
			context.takeScreenshot("secgear_monitor_feed");

			// The feed must show the wall: mostly red, not static grey.
			int[] rgb = context.computeOnClient(mc -> {
				var tex = mc.getTextureManager().getTexture(dk.ulfen.security.SecRegistry.id("feed/0_-60_-3"));
				if (!(tex instanceof net.minecraft.client.renderer.texture.DynamicTexture dyn) || dyn.getPixels() == null) return null;
				NativeImage img = dyn.getPixels();
				long r = 0, g = 0, b = 0;
				int n = 0;
				for (int y = 20; y < 52; y++) for (int x = 20; x < 76; x++) {
					int c = img.getPixel(x, y);
					r += (c >> 16) & 255; g += (c >> 8) & 255; b += c & 255; n++;
				}
				return new int[] {(int) (r / n), (int) (g / n), (int) (b / n)};
			});
			if (rgb == null) throw new AssertionError("monitor feed texture was never created");
			if (rgb[0] < rgb[2] + 30) throw new AssertionError("monitor feed does not show the red wall: rgb=" + rgb[0] + "," + rgb[1] + "," + rgb[2]);

			// Looking through the camera.
			context.runOnClient(mc -> CameraViewClient.start(new ViewCameraPayload(cam, 1, 1)));
			context.waitTicks(10);
			context.takeScreenshot("secgear_camera_view");
			context.runOnClient(mc -> CameraViewClient.stop(mc, null));
			context.waitTicks(5);

			// A gallery of the blocks.
			server.runCommand("fill -12 -60 -12 12 -50 12 air");
			String[] gallery = {
				"security_camera[facing=north]", "monitor[facing=south]", "laser_emitter[facing=up]", "laser_fence[facing=up]", "laser_receiver[facing=south]",
				"motion_sensor[facing=south]", "alarm_siren[facing=south,powered=true]", "keycard_reader[facing=south,level=3]", "timed_bomb[facing=south]",
				"tripwire_bomb[facing=up]", "searchlight[facing=south]", "bridge_winch[facing=south]"};
			for (int i = 0; i < gallery.length; i++) {
				int x = -11 + 2 * i;
				server.runCommand("setblock " + x + " -60 0 secgear:" + gallery[i]);
			}
			String[] row2 = {"reinforced_concrete", "prison_wall", "prison_bars", "barbed_wire", "razor_wire", "pit_trapdoor"};
			for (int i = 0; i < row2.length; i++) server.runCommand("setblock " + (-7 + 2 * i) + " -60 3 secgear:" + row2[i]);
			server.runCommand("setblock 5 -60 3 secgear:cell_door[facing=south,half=lower]");
			server.runCommand("setblock 5 -59 3 secgear:cell_door[facing=south,half=upper]");
			server.runCommand("summon secgear:security_guard -3 -60 -3 {NoAI:1b,Rotation:[0f,0f]}");
			server.runCommand("summon secgear:guard_dog 1 -60 -3 {NoAI:1b,Rotation:[20f,0f]}");
			server.runCommand("tp @p 0.5 -56 -10 0 22");
			context.waitTicks(40);
			context.takeScreenshot("secgear_gallery");

			// The criminals, one in each outfit, lined up between a guard and the brute.
			server.runCommand("fill -12 -60 -12 12 -50 12 air");
			server.runCommand("tp @e[type=!player] 0 -200 0");
			context.waitTicks(5);
			for (int i = 0; i < 4; i++) server.runCommand("summon secgear:criminal " + (-4 + 2 * i) + " -60 -3 {NoAI:1b,Variant:" + i + ",Rotation:[180f,0f]}");
			server.runCommand("summon secgear:security_guard 5 -60 -3 {NoAI:1b,Rotation:[160f,0f]}");
			server.runCommand("summon secgear:brute -7 -60 -3 {NoAI:1b,Variant:0,Rotation:[180f,0f]}");
			server.runCommand("tp @p -0.5 -58 -10 0 12");
			context.waitTicks(40);
			context.takeScreenshot("secgear_criminals");

			// A guard tower with its searchlight on at night, and lasers across the yard.
			server.runCommand("fill -12 -60 -12 12 -50 12 air");
			server.runCommand("kill @e[type=!player]");
			server.runOnServer(s -> Blueprints.build(s.overworld(), "guard_tower", new BlockPos(0, -60, 4), Direction.SOUTH));
			server.runCommand("setblock -4 -60 0 secgear:laser_emitter[facing=east]");
			server.runCommand("setblock 4 -60 0 secgear:laser_receiver[facing=west]");
			server.runCommand("setblock -4 -59 -2 secgear:laser_fence[facing=east]");
			server.runCommand("setblock 4 -59 -2 secgear:laser_receiver[facing=west]");
			server.runCommand("setblock -3 -60 -5 secgear:tripwire_bomb[facing=east]");
			server.runCommand("time set midnight");
			server.runCommand("tp @p 0.5 -57 -14 0 12");
			context.waitTicks(80);
			context.takeScreenshot("secgear_guard_tower_night");
			boolean lit = server.computeOnServer(s -> {
				for (BlockPos p : BlockPos.betweenClosed(-3, -54, 3, 3, -52, 10)) {
					var state = s.overworld().getBlockState(p);
					if (state.is(dk.ulfen.security.SecRegistry.SEARCHLIGHT)) return state.getValue(dk.ulfen.security.block.SearchlightBlock.POWERED);
				}
				return false;
			});
			if (!lit) throw new AssertionError("the guard tower's searchlight is not on at night");
			server.runCommand("gamemode spectator @p");
			server.runCommand("tp @p 0.5 -49 22 180 25");
			context.waitTicks(40);
			context.takeScreenshot("secgear_searchlight");

			// Prison cell and gatehouse by day.
			server.runCommand("gamemode creative @p");
			server.runCommand("time set noon");
			server.runCommand("fill -14 -60 -14 14 -45 14 air");
			server.runOnServer(s -> {
				Blueprints.build(s.overworld(), "prison_cell", new BlockPos(-6, -60, 2), Direction.SOUTH);
				Blueprints.build(s.overworld(), "gatehouse", new BlockPos(6, -60, 2), Direction.SOUTH);
			});
			server.runCommand("tp @p 0.5 -55 -12 0 20");
			context.waitTicks(40);
			context.takeScreenshot("secgear_cell_and_gatehouse");
		}
	}
}
