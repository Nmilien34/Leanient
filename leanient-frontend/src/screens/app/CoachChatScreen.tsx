import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { COACH_CHAT_MAX_CONTENT_LENGTH, COACH_CHAT_MAX_MESSAGES, type CoachChatMessage } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import apiService, { isSubscriptionRequired } from "../../services/api.service";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

function Spark() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

const GREETING: CoachChatMessage = {
  role: "assistant",
  content:
    "I'm your Leanient coach. Ask me why the scale's moving the way it is, what to eat to hit your protein, or how to train this week. For anything about your dose or how you feel physically, your prescriber is the right call.",
};

const SUGGESTIONS = [
  "Why has the scale been quiet?",
  "How do I protect my muscle this week?",
  "What should I eat to hit my protein?",
  "I feel like giving up.",
];

interface CoachChatScreenProps {
  visible: boolean;
  onClose: () => void;
  /** Called when a non-subscribed user hits the gate, to open the paywall. */
  onUpgrade: () => void;
  /**
   * Replaces the default suggestion chips. Callers opening the chat from a
   * specific context (e.g. a just-scanned meal) pass questions that carry that
   * context, since the backend only knows about logged data.
   */
  suggestions?: string[];
}

/**
 * The constrained AI coach chat. Suggested questions seed the conversation and a
 * capped text box handles follow-ups. The backend injects the user's data and
 * holds the medical-advice boundaries, so this screen stays a thin chat shell.
 */
export function CoachChatScreen({ visible, onClose, onUpgrade, suggestions }: CoachChatScreenProps) {
  const [messages, setMessages] = useState<CoachChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [errored, setErrored] = useState(false);
  const [locked, setLocked] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) {
      setMessages([GREETING]);
      setInput("");
      setPending(false);
      setErrored(false);
      setLocked(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages, pending, visible]);

  const run = async (conversation: CoachChatMessage[]) => {
    setPending(true);
    setErrored(false);
    try {
      const payload = conversation.slice(-COACH_CHAT_MAX_MESSAGES);
      const res = await apiService.coachChat(payload);
      setMessages([...conversation, { role: "assistant", content: res.reply }]);
    } catch (error) {
      if (isSubscriptionRequired(error)) {
        setLocked(true);
      } else {
        setErrored(true);
      }
    } finally {
      setPending(false);
    }
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const next: CoachChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    void run(next);
  };

  const retry = () => {
    if (pending) return;
    void run(messages);
  };

  if (!visible) return null;

  const conversationStarted = messages.length > 1;
  const canSend = input.trim().length > 0 && !pending;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.head}>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6L6 18" />
              </Svg>
            </Pressable>
            <View style={styles.headCenter}>
              <View style={styles.coachdot}>
                <Spark />
              </View>
              <Text style={styles.headTitle}>Leanient coach</Text>
            </View>
            <View style={styles.closeBtn} />
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message, index) =>
              message.role === "assistant" ? (
                <View key={index} style={styles.coachRow}>
                  <Text style={styles.coachText}>{message.content}</Text>
                </View>
              ) : (
                <View key={index} style={styles.userRow}>
                  <Text style={styles.userText}>{message.content}</Text>
                </View>
              ),
            )}

            {pending ? (
              <View style={styles.coachRow}>
                <ActivityIndicator color={colors.emerald} />
              </View>
            ) : null}

            {errored ? (
              <Pressable onPress={retry} style={styles.errorRow}>
                <Text style={styles.errorText}>The coach didn't answer. Tap to try again.</Text>
              </Pressable>
            ) : null}

            {locked ? (
              <View style={styles.lockCard}>
                <Text style={styles.lockTitle}>The coach is part of Premium</Text>
                <Text style={styles.lockBody}>
                  Start your trial to ask the coach about your weight, protein, and training, grounded
                  in your own data.
                </Text>
                <Pressable accessibilityRole="button" onPress={onUpgrade} style={styles.lockBtn}>
                  <Text style={styles.lockBtnText}>See plans</Text>
                </Pressable>
              </View>
            ) : null}

            {!conversationStarted && !locked ? (
              <View style={styles.suggestions}>
                {(suggestions ?? SUGGESTIONS).map((question) => (
                  <Pressable
                    key={question}
                    accessibilityRole="button"
                    onPress={() => send(question)}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>{question}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>

          {locked ? null : (
          <View style={styles.composer}>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask the coach"
                placeholderTextColor={colors.faint}
                multiline
                maxLength={COACH_CHAT_MAX_CONTENT_LENGTH}
                editable={!pending}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => send(input)}
              />
              <Pressable
                accessibilityLabel="Send"
                disabled={!canSend}
                onPress={() => send(input)}
                style={[styles.sendBtn, canSend ? styles.sendBtnOn : styles.sendBtnOff]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#F4FBF7" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M5 12h14M13 6l6 6-6 6" />
                </Svg>
              </Pressable>
            </View>
            <Text style={styles.disc}>
              Based on your logged behavior, not medical advice. Talk to your prescriber about anything dose related.
            </Text>
          </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper, zIndex: 80 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  coachdot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  headTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  scroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 16, gap: 10 },
  coachRow: {
    alignSelf: "flex-start",
    maxWidth: "86%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    borderTopLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  coachText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.ink },
  userRow: {
    alignSelf: "flex-end",
    maxWidth: "86%",
    backgroundColor: colors.emeraldDeep,
    borderRadius: 18,
    borderTopRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  userText: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: "#F4FBF7" },
  errorRow: {
    alignSelf: "flex-start",
    backgroundColor: "#FBEDED",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { fontFamily: font.medium, fontSize: 13.5, color: colors.amberDeep },
  lockCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(47,184,122,0.25)",
    borderRadius: 18,
    padding: 18,
    gap: 10,
    marginTop: 4,
  },
  lockTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink },
  lockBody: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.inkSoft },
  lockBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: colors.emeraldDeep,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  lockBtnText: { fontFamily: font.semibold, fontSize: 15, color: "#F4FBF7" },
  suggestions: { gap: 8, paddingTop: 4 },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(47,184,122,0.10)",
    borderWidth: 1,
    borderColor: "rgba(47,184,122,0.25)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: { fontFamily: font.semibold, fontSize: 14, color: colors.emeraldDeep },
  composer: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.ink, maxHeight: 120, paddingVertical: 6 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  sendBtnOn: { backgroundColor: colors.emeraldDeep },
  sendBtnOff: { backgroundColor: colors.faintest },
  disc: { fontFamily: font.regular, fontSize: 11, lineHeight: 15, color: colors.faint, paddingHorizontal: 6, paddingTop: 8 },
});

export default CoachChatScreen;
