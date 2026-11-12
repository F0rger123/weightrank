import { Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { C } from "./theme";

// Same geometry as scripts/make-icons.py: rank shield with a cut-out double chevron.
const SHIELD = "M50 5.9 L88 20 L88 51.8 L72.8 76.5 L50 94.1 L27.2 76.5 L12 51.8 L12 20 Z";
const CHEV1 = "M28.7 43.9 L50 22.6 L71.3 43.9 L71.3 55.3 L50 34 L28.7 55.3 Z";
const CHEV2 = "M28.7 65.2 L50 43.9 L71.3 65.2 L71.3 76.6 L50 55.3 L28.7 76.6 Z";

export function Mark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="wr" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.accent} />
          <Stop offset="1" stopColor={C.accent2} />
        </LinearGradient>
      </Defs>
      <Path d={`${SHIELD} ${CHEV1} ${CHEV2}`} fill="url(#wr)" fillRule="evenodd" />
    </Svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Mark size={size * 1.1} />
      <Text style={{ fontSize: size * 0.82, fontWeight: "900", fontStyle: "italic", color: C.text, letterSpacing: -0.5 }}>
        WEIGHT<Text style={{ color: C.accent }}>RANK</Text>
      </Text>
    </View>
  );
}
