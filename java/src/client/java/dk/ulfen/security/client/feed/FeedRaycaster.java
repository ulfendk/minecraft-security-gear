package dk.ulfen.security.client.feed;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.mojang.blaze3d.platform.NativeImage;

import dk.ulfen.security.client.mixin.SpriteContentsAccessor;
import dk.ulfen.security.entity.CameraView;
import dk.ulfen.security.entity.GuardDog;
import dk.ulfen.security.entity.SecurityGuard;
import net.minecraft.client.Minecraft;
import net.minecraft.client.color.block.BlockTintSource;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.renderer.block.dispatch.BlockStateModel;
import net.minecraft.client.renderer.block.dispatch.BlockStateModelPart;
import net.minecraft.client.renderer.texture.SpriteContents;
import net.minecraft.client.renderer.texture.TextureAtlasSprite;
import net.minecraft.client.resources.model.geometry.BakedQuad;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.util.Mth;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.material.FluidState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.Vec3;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * Draws what a security camera sees into a small image, on the CPU: one ray per
 * pixel through the world, sampling each block's real texture (and biome tint),
 * shaded by the light level, with simple silhouettes for mobs and players.
 * Rows are drawn interlaced (a third per call), like an old CCTV camera.
 */
public final class FeedRaycaster {
	public static final int WIDTH = 96, HEIGHT = 72, FIELDS = 3;
	private static final float FOV = 70.0F;
	private static final double RANGE = 40.0;
	private static final int WATER = 0x3F76E4;

	/** Per block state and face: the texture and tint index to sample. */
	private record Face(NativeImage image, int width, int height, int tint) {}

	private static final Map<BlockState, Face[]> FACES = new HashMap<>();
	private static final RandomSource RANDOM = RandomSource.create(42L);

	private FeedRaycaster() {}

	/** Call when textures are reloaded. */
	public static void clearCache() {
		FACES.clear();
	}

	/** Draw one interlaced field (rows field, field+3, ...) of the view from `eye`. */
	public static void render(NativeImage out, ClientLevel level, Vec3 eye, float yaw, float pitch, int field, int cameraNumber) {
		Minecraft mc = Minecraft.getInstance();
		float y = yaw * Mth.DEG_TO_RAD, p = pitch * Mth.DEG_TO_RAD;
		Vec3 forward = new Vec3(-Mth.sin(y) * Mth.cos(p), -Mth.sin(p), Mth.cos(y) * Mth.cos(p));
		Vec3 right = new Vec3(-Mth.cos(y), 0, -Mth.sin(y));
		Vec3 up = right.cross(forward);
		double tan = Math.tan(Math.toRadians(FOV / 2));
		double aspect = (double) WIDTH / HEIGHT;

		List<Entity> entities = new ArrayList<>();
		for (Entity e : level.getEntities((Entity) null, new AABB(eye, eye).inflate(RANGE), e -> !(e instanceof CameraView) && !(e instanceof ItemEntity) && !e.isInvisible())) entities.add(e);

		int darken = level.getSkyDarken();
		int sky = mix(0x86AFFF, 0x0B1026, darken / 11.0F);
		Map<Long, Integer> tints = new HashMap<>();
		BlockPos tintAt = BlockPos.containing(eye);

		for (int j = field; j < HEIGHT; j += FIELDS) {
			for (int i = 0; i < WIDTH; i++) {
				double sx = (2 * (i + 0.5) / WIDTH - 1) * tan * aspect;
				double sy = (1 - 2 * (j + 0.5) / HEIGHT) * tan;
				Vec3 dir = forward.add(right.scale(sx)).add(up.scale(sy)).normalize();
				int color = trace(mc, level, eye, dir, entities, sky, darken, tints, tintAt);
				out.setPixel(i, j, post(color, i, j, level.getGameTime()));
			}
		}
		if (field == FIELDS - 1 || field == 0) overlay(out, cameraNumber, level);
	}

	// ---------------------------------------------------------------- ray tracing

	private static int trace(Minecraft mc, ClientLevel level, Vec3 eye, Vec3 dir, List<Entity> entities, int sky, int darken, Map<Long, Integer> tints, BlockPos tintAt) {
		// Nearest entity along the ray.
		double entityDist = RANGE;
		Entity hitEntity = null;
		Vec3 hitEntityPos = null;
		Vec3 far = eye.add(dir.scale(RANGE));
		for (Entity e : entities) {
			var hit = e.getBoundingBox().clip(eye, far);
			if (hit.isPresent()) {
				double d = hit.get().distanceTo(eye);
				if (d < entityDist) {
					entityDist = d;
					hitEntity = e;
					hitEntityPos = hit.get();
				}
			}
		}

		// Walk the block grid (Amanatides & Woo).
		int x = Mth.floor(eye.x), y = Mth.floor(eye.y), z = Mth.floor(eye.z);
		int stepX = dir.x > 0 ? 1 : -1, stepY = dir.y > 0 ? 1 : -1, stepZ = dir.z > 0 ? 1 : -1;
		double tDeltaX = dir.x == 0 ? Double.MAX_VALUE : Math.abs(1 / dir.x);
		double tDeltaY = dir.y == 0 ? Double.MAX_VALUE : Math.abs(1 / dir.y);
		double tDeltaZ = dir.z == 0 ? Double.MAX_VALUE : Math.abs(1 / dir.z);
		double tMaxX = dir.x == 0 ? Double.MAX_VALUE : ((stepX > 0 ? x + 1 - eye.x : eye.x - x) * tDeltaX);
		double tMaxY = dir.y == 0 ? Double.MAX_VALUE : ((stepY > 0 ? y + 1 - eye.y : eye.y - y) * tDeltaY);
		double tMaxZ = dir.z == 0 ? Double.MAX_VALUE : ((stepZ > 0 ? z + 1 - eye.z : eye.z - z) * tDeltaZ);
		double t = 0;
		Direction face = Direction.UP;
		float water = 0;
		BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
		boolean first = true;

		while (t < Math.min(entityDist, RANGE)) {
			pos.set(x, y, z);
			BlockState state = level.getBlockState(pos);
			if (!first || !state.is(dk.ulfen.security.SecRegistry.SECURITY_CAMERA)) {
				FluidState fluid = state.getFluidState();
				if (!fluid.isEmpty() && water < 0.7F) water += 0.2F;
				if (!state.isAir() && state.getRenderShape() != net.minecraft.world.level.block.RenderShape.INVISIBLE) {
					int c = shade(mc, level, state, pos, eye, dir, t, face, darken, tints, tintAt);
					if (c != -1) return mix(c, WATER, water);
				}
			}
			first = false;
			if (tMaxX < tMaxY && tMaxX < tMaxZ) {
				x += stepX; t = tMaxX; tMaxX += tDeltaX; face = stepX > 0 ? Direction.WEST : Direction.EAST;
			} else if (tMaxY < tMaxZ) {
				y += stepY; t = tMaxY; tMaxY += tDeltaY; face = stepY > 0 ? Direction.DOWN : Direction.UP;
			} else {
				z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; face = stepZ > 0 ? Direction.NORTH : Direction.SOUTH;
			}
		}
		if (hitEntity != null) {
			int light = level.getRawBrightness(BlockPos.containing(hitEntityPos), darken);
			return mix(scale(entityColor(hitEntity, hitEntityPos), 0.25F + 0.75F * light / 15.0F), WATER, water);
		}
		return mix(sky, WATER, water);
	}

	/** Colour where the ray meets this block, or -1 to look through it (air gaps in the shape, cut-out texels). */
	private static int shade(Minecraft mc, ClientLevel level, BlockState state, BlockPos pos, Vec3 eye, Vec3 dir, double t, Direction face, int darken,
		Map<Long, Integer> tints, BlockPos tintAt) {
		Vec3 hit = eye.add(dir.scale(t));
		VoxelShape shape = state.getShape(level, pos);
		if (shape.isEmpty()) shape = net.minecraft.world.phys.shapes.Shapes.block();
		if (!isFullBlock(shape)) {
			BlockHitResult r = shape.clip(eye, eye.add(dir.scale(t + 2)), pos);
			if (r == null) return -1;
			hit = r.getLocation();
			face = r.getDirection();
		}
		Face f = faces(mc, state)[face.get3DDataValue()];
		if (f == null) return -1;
		double fx = hit.x - Math.floor(hit.x), fy = hit.y - Math.floor(hit.y), fz = hit.z - Math.floor(hit.z);
		double u, v;
		switch (face) {
			case UP -> { u = fx; v = fz; }
			case DOWN -> { u = fx; v = 1 - fz; }
			case NORTH -> { u = 1 - fx; v = 1 - fy; }
			case SOUTH -> { u = fx; v = 1 - fy; }
			case WEST -> { u = fz; v = 1 - fy; }
			default -> { u = 1 - fz; v = 1 - fy; }
		}
		int px = Mth.clamp((int) (u * f.width), 0, f.width - 1), py = Mth.clamp((int) (v * f.height), 0, f.height - 1);
		int argb = f.image.getPixel(px, py);
		if ((argb >>> 24) < 100) return -1;
		int color = argb & 0xFFFFFF;
		if (f.tint >= 0) {
			long key = ((long) Block2Id.of(state) << 8) | f.tint;
			Integer tint = tints.get(key);
			if (tint == null) {
				BlockTintSource src = mc.getBlockColors().getTintSource(state, f.tint);
				tint = src == null ? 0xFFFFFF : src.colorInWorld(state, level, tintAt) & 0xFFFFFF;
				tints.put(key, tint);
			}
			color = multiply(color, tint);
		}
		float faceShade = switch (face) {
			case UP -> 1.0F;
			case DOWN -> 0.5F;
			case NORTH, SOUTH -> 0.8F;
			default -> 0.65F;
		};
		int light = Math.max(level.getRawBrightness(pos.relative(face), darken), state.getLightEmission() > 0 ? 15 : 0);
		return scale(color, faceShade * (0.18F + 0.82F * light / 15.0F));
	}

	private static boolean isFullBlock(VoxelShape shape) {
		AABB b = shape.bounds();
		return shape.toAabbs().size() == 1 && b.minX == 0 && b.minY == 0 && b.minZ == 0 && b.maxX == 1 && b.maxY == 1 && b.maxZ == 1;
	}

	private static Face[] faces(Minecraft mc, BlockState state) {
		return FACES.computeIfAbsent(state, s -> {
			Face[] out = new Face[6];
			BlockStateModel model = mc.getModelManager().getBlockStateModelSet().get(s);
			List<BlockStateModelPart> parts = new ArrayList<>();
			model.collectParts(RANDOM, parts);
			for (Direction d : Direction.values()) {
				BakedQuad quad = null;
				for (BlockStateModelPart part : parts) {
					for (BakedQuad q : part.getQuads(d)) { quad = q; break; }
					if (quad != null) break;
					for (BakedQuad q : part.getQuads(null)) if (q.direction() == d) { quad = q; break; }
					if (quad != null) break;
				}
				TextureAtlasSprite sprite = quad != null ? quad.materialInfo().sprite() : model.particleMaterial().sprite();
				SpriteContents contents = sprite.contents();
				NativeImage image = ((SpriteContentsAccessor) contents).secgear$originalImage();
				if (image == null) continue;
				out[d.get3DDataValue()] = new Face(image, contents.width(), contents.height(), quad != null ? quad.materialInfo().tintIndex() : -1);
			}
			return out;
		});
	}

	/** Stable small ids for block states, for the tint cache key. */
	private static final class Block2Id {
		private static final Map<BlockState, Integer> IDS = new HashMap<>();

		static int of(BlockState s) {
			return IDS.computeIfAbsent(s, k -> IDS.size());
		}
	}

	private static int entityColor(Entity e, Vec3 hit) {
		AABB box = e.getBoundingBox();
		boolean head = e instanceof LivingEntity && hit.y > box.maxY - box.getYsize() * 0.27;
		if (e instanceof Player) return head ? 0xC99A78 : 0x2F5AA8;
		if (e instanceof SecurityGuard) return head ? 0xC99A78 : 0x2F4A7A;
		if (e instanceof GuardDog) return 0xB98446;
		EntityType<?> t = e.getType();
		if (t == EntityTypes.ZOMBIE || t == EntityTypes.HUSK || t == EntityTypes.DROWNED) return head ? 0x5F9F4F : 0x2F8F8F;
		if (t == EntityTypes.SKELETON || t == EntityTypes.STRAY) return 0xC8C8C8;
		if (t == EntityTypes.CREEPER) return 0x4FA13F;
		if (t == EntityTypes.SPIDER || t == EntityTypes.CAVE_SPIDER) return 0x3A3028;
		if (t == EntityTypes.ENDERMAN) return 0x161616;
		if (t == EntityTypes.COW) return 0x5A3E2A;
		if (t == EntityTypes.PIG) return 0xE8A0A0;
		if (t == EntityTypes.SHEEP || t == EntityTypes.CHICKEN) return 0xEAEAEA;
		if (e instanceof Enemy) return 0x4A6A3A;
		if (e instanceof Animal) return 0x8A6A4A;
		return 0x8A8A8A;
	}

	// ---------------------------------------------------------------- CCTV look

	private static int post(int rgb, int x, int y, long time) {
		int r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255;
		int grey = (r * 30 + g * 59 + b * 11) / 100;
		r = (r * 7 + grey * 3) / 10;
		g = (g * 7 + grey * 3) / 10;
		b = (b * 7 + grey * 3) / 10;
		int noise = (int) ((hash(x, y, time) & 15) - 7);
		float line = y % 2 == 0 ? 1.0F : 0.88F;
		double dx = (x - WIDTH / 2.0) / (WIDTH / 2.0), dy = (y - HEIGHT / 2.0) / (HEIGHT / 2.0);
		float vignette = (float) Math.max(0.55, 1 - 0.3 * (dx * dx + dy * dy));
		r = Mth.clamp((int) ((r + noise) * line * vignette), 0, 255);
		g = Mth.clamp((int) ((g + noise) * line * vignette), 0, 255);
		b = Mth.clamp((int) ((b + noise) * line * vignette), 0, 255);
		return 0xFF000000 | r << 16 | g << 8 | b;
	}

	private static long hash(int x, int y, long t) {
		long h = x * 374761393L + y * 668265263L + t * 2246822519L;
		h = (h ^ (h >>> 13)) * 1274126177L;
		return h ^ (h >>> 16);
	}

	/** 3x5 pixel digits and letters for the on-screen camera label and clock. */
	private static final Map<Character, String> FONT = Map.ofEntries(
		Map.entry('0', "111101101101111"), Map.entry('1', "010110010010111"), Map.entry('2', "111001111100111"),
		Map.entry('3', "111001111001111"), Map.entry('4', "101101111001001"), Map.entry('5', "111100111001111"),
		Map.entry('6', "111100111101111"), Map.entry('7', "111001001001001"), Map.entry('8', "111101111101111"),
		Map.entry('9', "111101111001111"), Map.entry(':', "000010000010000"), Map.entry('C', "111100100100111"),
		Map.entry('A', "111101111101101"), Map.entry('M', "101111111101101"), Map.entry(' ', "000000000000000"));

	private static void text(NativeImage out, String s, int x, int y, int color) {
		for (char ch : s.toCharArray()) {
			String g = FONT.getOrDefault(ch, FONT.get(' '));
			for (int k = 0; k < 15; k++) if (g.charAt(k) == '1') out.setPixel(x + k % 3, y + k / 3, color);
			x += 4;
		}
	}

	private static void overlay(NativeImage out, int cameraNumber, ClientLevel level) {
		text(out, "CAM" + cameraNumber, 3, 3, 0xFFF2F2F2);
		long ticks = (level.getOverworldClockTime() + 6000) % 24000;
		int hours = (int) (ticks / 1000), minutes = (int) (ticks % 1000 * 60 / 1000);
		text(out, String.format("%02d:%02d", hours, minutes), WIDTH - 23, HEIGHT - 8, 0xFFF2F2F2);
		if ((level.getGameTime() / 10) % 2 == 0) {
			for (int dy = 0; dy < 3; dy++) for (int dx = 0; dx < 3; dx++) out.setPixel(WIDTH - 7 + dx, 3 + dy, 0xFFFF2A1A);
		}
	}

	// ---------------------------------------------------------------- colour helpers

	static int mix(int a, int b, float t) {
		t = Mth.clamp(t, 0, 1);
		int r = (int) Mth.lerp(t, (a >> 16) & 255, (b >> 16) & 255);
		int g = (int) Mth.lerp(t, (a >> 8) & 255, (b >> 8) & 255);
		int bl = (int) Mth.lerp(t, a & 255, b & 255);
		return r << 16 | g << 8 | bl;
	}

	private static int scale(int c, float f) {
		return Mth.clamp((int) (((c >> 16) & 255) * f), 0, 255) << 16 | Mth.clamp((int) (((c >> 8) & 255) * f), 0, 255) << 8 | Mth.clamp((int) ((c & 255) * f), 0, 255);
	}

	private static int multiply(int a, int b) {
		return (((a >> 16) & 255) * ((b >> 16) & 255) / 255) << 16 | (((a >> 8) & 255) * ((b >> 8) & 255) / 255) << 8 | (a & 255) * (b & 255) / 255;
	}
}
