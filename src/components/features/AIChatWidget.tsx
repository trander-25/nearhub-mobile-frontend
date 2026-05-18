import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { sendAiChatMessage } from '@/services';
import { colors, fontWeights, spacing, typography } from '@/theme';
import type { ChatMessageItem } from '@/types';

interface AIChatWidgetProps {
  eventId?: string;
}

const newMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function AIChatWidget({ eventId }: AIChatWidgetProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const sessionIdRef = useRef(`mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const isKeyboardVisible = useKeyboardVisible();

  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi, I am Nearhub AI. Ask me for event ideas, timing, location tips, or what to expect.',
      createdAt: new Date().toISOString(),
    },
  ]);

  const contextLabel = useMemo(() => {
    return eventId ? 'Event assistant' : 'Discovery assistant';
  }, [eventId]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages, isThinking, visible]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || isThinking) return;

    const userMessage: ChatMessageItem = {
      id: newMessageId(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft('');
    setIsThinking(true);

    try {
      const response = await sendAiChatMessage({
        sessionId: sessionIdRef.current,
        message: text,
        eventId: eventId ?? null,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: newMessageId(),
          role: 'assistant',
          content: response.message,
          createdAt: response.createdAt,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: newMessageId(),
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Nearhub AI is unavailable right now.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <>
      {!isKeyboardVisible || visible ? (
        <Pressable
          style={[styles.fab, { bottom: Math.max(insets.bottom + 86, 104) }]}
          onPress={() => setVisible(true)}
        >
          <Feather name="message-circle" size={22} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
          style={styles.modalRoot}
        >
          <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Feather name="zap" size={17} color="#FFFFFF" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Nearhub AI</Text>
                <Text style={styles.subtitle}>{contextLabel}</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setVisible(false)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            >
              {messages.map((message) => {
                const isUser = message.role === 'user';
                return (
                  <View
                    key={message.id}
                    style={[styles.messageRow, isUser ? styles.userMessageRow : styles.assistantMessageRow]}
                  >
                    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                      <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.assistantBubbleText]}>
                        {message.content}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {isThinking ? (
                <View style={[styles.messageRow, styles.assistantMessageRow]}>
                  <View style={[styles.bubble, styles.assistantBubble, styles.thinkingBubble]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.thinkingText}>Thinking</Text>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.inputRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask about events..."
                placeholderTextColor={colors.textPlaceholder}
                multiline
                style={styles.input}
                editable={!isThinking}
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)}
              />
              <Pressable
                style={[styles.sendButton, (!draft.trim() || isThinking) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!draft.trim() || isThinking}
              >
                <Feather name="send" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 40,
    elevation: 40,
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: colors.primaryShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '82%',
    minHeight: 460,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography.body,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messagesContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
  },
  assistantMessageRow: {
    justifyContent: 'flex-start',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userBubble: {
    backgroundColor: colors.primaryDark,
    borderBottomRightRadius: 6,
  },
  bubbleText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  assistantBubbleText: {
    color: colors.textPrimary,
  },
  userBubbleText: {
    color: '#FFFFFF',
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  thinkingText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: fontWeights.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
