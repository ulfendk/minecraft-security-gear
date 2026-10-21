package dk.ulfen.security.structure;

import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import dk.ulfen.security.SecurityGear;
import dk.ulfen.security.blockentity.MonitorBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.Identifier;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.Rotation;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.Property;

/**
 * Builds the blueprint structures described in data/secgear/structures.json
 * (generated from src/structures.mjs; the Bedrock scripts read the same data).
 * Layers are drawn as if the player faced north and are turned to their facing.
 */
public final class Blueprints {
	private static JsonObject data;

	private Blueprints() {}

	private static JsonObject data() {
		if (data == null) {
			try (Reader r = new InputStreamReader(SecurityGear.class.getResourceAsStream("/data/secgear/structures.json"), StandardCharsets.UTF_8)) {
				data = JsonParser.parseReader(r).getAsJsonObject();
			} catch (Exception e) {
				throw new IllegalStateException("Missing data/secgear/structures.json (run npm run build)", e);
			}
		}
		return data;
	}

	public static List<String> names() {
		return new ArrayList<>(data().getAsJsonObject("structures").keySet());
	}

	private record Cell(char ch, BlockPos pos) {}

	private static List<Cell> cells(JsonArray layers, BlockPos base, Direction facing) {
		List<Cell> out = new ArrayList<>();
		Direction right = facing.getClockWise();
		for (int y = 0; y < layers.size(); y++) {
			JsonArray rows = layers.get(y).getAsJsonArray();
			int depth = rows.size();
			for (int r = 0; r < depth; r++) {
				String row = rows.get(r).getAsString();
				int width = row.length();
				for (int c = 0; c < width; c++) {
					char ch = row.charAt(c);
					if (ch == '.') continue;
					int f = depth - 1 - r, s = c - width / 2;
					out.add(new Cell(ch, base.above(y).relative(facing, f).relative(right, s)));
				}
			}
		}
		return out;
	}

	private static Rotation rotationFor(Direction facing) {
		return switch (facing) {
			case EAST -> Rotation.CLOCKWISE_90;
			case SOUTH -> Rotation.CLOCKWISE_180;
			case WEST -> Rotation.COUNTERCLOCKWISE_90;
			default -> Rotation.NONE;
		};
	}

	@SuppressWarnings({"unchecked", "rawtypes"})
	private static BlockState stateFor(JsonObject entry, Rotation rotation) {
		Block block = BuiltInRegistries.BLOCK.getValue(Identifier.parse(entry.get("java").getAsString()));
		BlockState state = block.defaultBlockState();
		if (entry.has("props")) {
			for (Map.Entry<String, JsonElement> p : entry.getAsJsonObject("props").entrySet()) {
				Property prop = block.getStateDefinition().getProperty(p.getKey());
				java.util.Optional value = prop == null ? java.util.Optional.empty() : prop.getValue(p.getValue().getAsString());
				if (value.isPresent()) state = state.setValue(prop, (Comparable) value.get());
			}
		}
		if (entry.has("facing")) {
			Property prop = block.getStateDefinition().getProperty("facing");
			Direction dir = rotation.rotate(Direction.byName(entry.get("facing").getAsString()));
			if (prop != null && prop.getPossibleValues().contains(dir)) state = state.setValue(prop, dir);
		}
		return state;
	}

	/** Build a structure. Returns the number of blocks placed, or -1 if something is in the way. */
	public static int build(ServerLevel level, String name, BlockPos base, Direction facing) {
		JsonObject structure = data().getAsJsonObject("structures").getAsJsonObject(name);
		JsonObject palette = data().getAsJsonObject("palette");
		if (structure == null) return -1;
		List<Cell> cells = cells(structure.getAsJsonArray("layers"), base, facing);
		for (Cell c : cells) {
			if (!level.getBlockState(c.pos).canBeReplaced() || level.isOutsideBuildHeight(c.pos)) return -1;
		}
		Rotation rotation = rotationFor(facing);
		List<BlockPos> placed = new ArrayList<>(), cameras = new ArrayList<>(), monitors = new ArrayList<>();
		Map<BlockPos, String> spawns = new LinkedHashMap<>();
		for (Cell c : cells) {
			JsonObject entry = palette.has(String.valueOf(c.ch)) ? palette.getAsJsonObject(String.valueOf(c.ch)) : null;
			if (c.ch == ' ' || entry == null || entry.has("spawn")) {
				level.setBlock(c.pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
				if (entry != null && entry.has("spawn")) spawns.put(c.pos, entry.get("spawn").getAsString());
				continue;
			}
			level.setBlock(c.pos, stateFor(entry, rotation), Block.UPDATE_CLIENTS);
			placed.add(c.pos);
			if (entry.has("link")) (entry.get("link").getAsString().equals("camera") ? cameras : monitors).add(c.pos);
		}
		// Second pass: let walls, bars, panes and fences connect, and notify neighbours.
		for (BlockPos p : placed) {
			BlockState s = level.getBlockState(p);
			level.setBlock(p, Block.updateFromNeighbourShapes(s, level, p), Block.UPDATE_ALL);
		}
		for (BlockPos m : monitors) if (level.getBlockEntity(m) instanceof MonitorBlockEntity monitor) monitor.link(cameras);
		spawns.forEach((pos, id) -> {
			Entity entity = BuiltInRegistries.ENTITY_TYPE.getValue(Identifier.parse(id)).create(level, EntitySpawnReason.STRUCTURE);
			if (entity == null) return;
			entity.snapTo(pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5, facing.toYRot(), 0);
			if (entity instanceof Mob mob) mob.finalizeSpawn(level, level.getCurrentDifficultyAt(pos), EntitySpawnReason.STRUCTURE, null);
			level.addFreshEntity(entity);
		});
		return placed.size();
	}

}
