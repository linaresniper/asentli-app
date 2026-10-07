// src/screens/AIAssistantScreen.js
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { categoryColor } from '../constants/categories';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import MarkdownText from '../components/MarkdownText';
import { useBudget, useMonthExpenses } from '../hooks/useExpenseData';
import { useAIAssistant } from '../hooks/useAIAssistant';
import { sumAmount, weeklyBars } from '../lib/expenseMath';
import { formatMoney } from '../lib/dates';

let nextId = 1;
const newId = () => `${Date.now()}-${nextId++}`;

export default function AIAssistantScreen({ onBack, onNavigate }) {
  const { t } = useTranslation('aiAssistant');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const go = (key) => onNavigate && onNavigate(key);

  const budgetQ = useBudget();
  const expensesQ = useMonthExpenses();
  const assistant = useAIAssistant();

  const scrollRef = useRef(null);
  // Solo bajamos solos cuando entra algo nuevo al chat, no en el montaje
  // inicial ni cuando el usuario está leyendo hacia arriba.
  const shouldScrollRef = useRef(false);

  const [message, setMessage] = useState('');
  // El saludo se guarda como clave, no como texto: así cambia de idioma con
  // la app en vez de quedar congelado en el idioma que había al abrir la
  // pantalla (se traduce al renderizar, en ChatBubble).
  const [messages, setMessages] = useState(() => [{ id: newId(), role: 'ai', textKey: 'welcomeMessage' }]);

  const loadingChart = budgetQ.isLoading || expensesQ.isLoading;
  const monthlyTotal = budgetQ.data?.monthlyTotal ?? 0;
  const expenses = expensesQ.data ?? [];
  const spent = sumAmount(expenses);
  const bars = weeklyBars(expenses);
  const maxBar = Math.max(...bars.map((b) => b.amount), 0);
  const hasChartData = spent > 0;

  const appendMessage = (msg) => {
    shouldScrollRef.current = true;
    setMessages((prev) => [...prev, { id: newId(), ...msg }]);
  };

  const sendText = (text) => {
    const trimmed = text.trim();
    if (!trimmed || assistant.isPending) return;
    appendMessage({ role: 'user', text: trimmed });
    setMessage('');
    shouldScrollRef.current = true;
    assistant.mutate(trimmed, {
      onSuccess: ({ reply, data }) => appendMessage({ role: 'ai', text: reply, data }),
      onError: (err) => appendMessage({ role: 'error', text: err.message }),
    });
  };

  const handleImagePicked = (result) => {
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;
    appendMessage({ role: 'user', imageUri: uri });
    appendMessage({ role: 'ai', textKey: 'ticketReceived' });
  };

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common:permissionNeeded'), t('cameraPermission'));
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5 });
      handleImagePicked(result);
    } catch {
      Alert.alert(t('common:error'), t('cameraError'));
    }
  };

  const openGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common:permissionNeeded'), t('galleryPermission'));
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
      handleImagePicked(result);
    } catch {
      Alert.alert(t('common:error'), t('galleryError'));
    }
  };

  const onUploadTicket = () => {
    Alert.alert(t('uploadTicketButton'), t('uploadTicketMessage'), [
      { text: t('cameraOption'), onPress: openCamera },
      { text: t('galleryOption'), onPress: openGallery },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title={t('headerTitle')} onBack={onBack} onBell={() => go('notifications')} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        // onContentSizeChange en vez de un useEffect: dispara cuando el alto
        // real ya se midió, así el scrollToEnd no se queda corto con una
        // respuesta larga que todavía no terminó de hacer layout.
        onContentSizeChange={() => {
          if (!shouldScrollRef.current) return;
          shouldScrollRef.current = false;
          scrollRef.current?.scrollToEnd({ animated: true });
        }}
      >
        {/* Greeting bubble */}
        <View style={styles.greetingCard}>
          <Text style={styles.greetingTitle}>{t('greetingTitle')}</Text>
          <Text style={styles.greetingText}>{t('greetingText')}</Text>
        </View>

        {/* Weekly chart — datos reales del mes actual */}
        <View style={styles.predictionBox}>
          <View style={styles.predictionHeaderRow}>
            <View style={styles.predictionTitleRow}>
              <Ionicons name="stats-chart" size={18} color={colors.text} />
              <Text style={styles.predictionTitle}>{t('chartTitle')}</Text>
            </View>
            <Text style={styles.iaActiveTag}>{t('aiActiveTag')}</Text>
          </View>

          {loadingChart ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 24 }} />
          ) : (
            <>
              <View style={styles.chartRow}>
                {bars.map((b) => {
                  const height = maxBar > 0 ? 8 + (b.amount / maxBar) * 92 : 6;
                  return (
                    <View key={b.n} style={styles.barColumn}>
                      <Text style={styles.barValue}>{formatMoney(b.amount)}</Text>
                      <View style={[styles.bar, { height, backgroundColor: colors.mintBar }]} />
                      <Text style={styles.barLabel}>{t('common:week', { n: b.n })}</Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.suggestionText}>
                {monthlyTotal > 0 ? (
                  <>
                    <Text style={styles.suggestionBold}>{t('budgetLabel')}</Text>
                    {formatMoney(monthlyTotal)}{t('spentInline')}{formatMoney(spent)}
                  </>
                ) : hasChartData ? (
                  t('noBudgetConfigured')
                ) : (
                  t('noExpensesYetHint')
                )}
              </Text>
            </>
          )}
        </View>

        {/* Chat history */}
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}

        {assistant.isPending && (
          <View style={styles.chatRow}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
            </View>
            <View style={styles.chatBubble}>
              <ActivityIndicator size="small" color={colors.textLight} />
            </View>
          </View>
        )}

        {/* Quick suggestions */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => sendText(t('quickSpendLess'))}
            disabled={assistant.isPending}
          >
            <Ionicons name="bulb-outline" size={16} color={colors.text} />
            <Text style={styles.quickText}>{t('quickSpendLess')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickButton} onPress={onUploadTicket}>
            <Ionicons name="camera-outline" size={16} color={colors.text} />
            <Text style={styles.quickText}>{t('uploadTicketButton')}</Text>
          </TouchableOpacity>
        </View>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={t('inputPlaceholder')}
            placeholderTextColor={colors.textLight}
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={() => sendText(message)}
            editable={!assistant.isPending}
          />
          <TouchableOpacity
            style={[styles.sendButton, assistant.isPending && styles.sendButtonDisabled]}
            onPress={() => sendText(message)}
            disabled={assistant.isPending}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>{t('disclaimer')}</Text>
      </ScrollView>

      <BottomNav active="Basket" onNavigate={onNavigate} />
    </KeyboardAvoidingView>
  );
}

function ChatBubble({ message }) {
  const { t } = useTranslation('aiAssistant');
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors);
  // Los mensajes propios de la app viajan como `textKey`; los de la IA y los
  // errores ya vienen como texto final y se muestran tal cual.
  const text = message.textKey ? t(message.textKey) : message.text;

  if (message.role === 'user') {
    return (
      <View style={[styles.chatRow, styles.chatRowReverse]}>
        <View style={[styles.chatBubble, styles.userBubble]}>
          {message.imageUri ? (
            <Image source={{ uri: message.imageUri }} style={styles.ticketImage} />
          ) : (
            <Text style={[styles.chatText, styles.userChatText]}>{text}</Text>
          )}
        </View>
      </View>
    );
  }

  if (message.role === 'error') {
    return (
      <View style={styles.chatRow}>
        <View style={styles.aiAvatar}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
        </View>
        <View style={[styles.chatBubble, styles.errorBubble, isDark && styles.errorBubbleDark]}>
          <Text style={[styles.chatText, styles.errorText]}>{text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chatRow}>
      <View style={styles.aiAvatar}>
        <Ionicons name="sparkles" size={16} color={colors.primary} />
      </View>
      <View style={styles.chatBubble}>
        <MarkdownText text={text} style={styles.chatText} />
        {message.data?.byCategory?.length > 0 && (
          <ChatCategoryBreakdown data={message.data} colors={colors} styles={styles} />
        )}
      </View>
    </View>
  );
}

// Desglose por categoría, estructurado: la Edge Function manda los mismos
// números que ya usa para armar el texto (ver buildStructuredData en
// supabase/functions/ai-assistant/index.ts), y esta burbuja decide
// renderizarlos como mini-barras en vez de texto plano.
//
// La función manda solo `key` + `amount`: el nombre visible y el color salen
// de src/constants/categories.js igual que en el resto de la app, así el chat
// nunca puede decir "Alimentos" mientras la pantalla de al lado dice "Food".
function ChatCategoryBreakdown({ data, colors, styles }) {
  const categoryLabel = useCategoryLabel();
  const maxAmount = Math.max(...data.byCategory.map((c) => c.amount), 0);

  return (
    <View style={styles.breakdownWrap}>
      {data.byCategory.map((c) => {
        const barColor = categoryColor(c.key);
        const widthPct = maxAmount > 0 ? (c.amount / maxAmount) * 100 : 0;
        return (
          <View key={c.key} style={styles.breakdownRow}>
            <View style={[styles.breakdownDot, { backgroundColor: barColor }]} />
            <Text style={styles.breakdownLabel}>{categoryLabel(c.key)}</Text>
            <View style={styles.breakdownBarTrack}>
              <View style={[styles.breakdownBarFill, { width: `${widthPct}%`, backgroundColor: barColor }]} />
            </View>
            <Text style={styles.breakdownAmount}>{formatMoney(c.amount)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.card },

  content: { paddingHorizontal: 20, paddingBottom: 20 },

  greetingCard: {
    backgroundColor: colors.lightGreen,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  greetingText: { fontSize: 14, color: colors.text, lineHeight: 20 },

  predictionBox: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  predictionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  predictionTitleRow: { flexDirection: 'row', flex: 1, gap: 8, alignItems: 'center' },
  predictionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 },
  iaActiveTag: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'right',
  },

  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
    marginBottom: 16,
  },
  barColumn: { alignItems: 'center' },
  barValue: { fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: 6 },
  bar: { width: 26, borderRadius: 6 },
  barLabel: { fontSize: 11, color: colors.textLight, marginTop: 6 },

  suggestionText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  suggestionBold: { fontWeight: '800', color: colors.bottleGreenText },

  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
  },
  chatRowReverse: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBubble: {
    flex: 1,
    backgroundColor: colors.chatBubble,
    borderRadius: 16,
    padding: 14,
  },
  userBubble: {
    flex: 0,
    maxWidth: '80%',
    backgroundColor: colors.primary,
  },
  errorBubble: {
    backgroundColor: '#FBE9E7',
  },
  errorBubbleDark: {
    backgroundColor: '#3A2420',
  },
  chatText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  userChatText: { color: '#FFFFFF' },
  errorText: { color: colors.error },

  breakdownWrap: { marginTop: 10, gap: 8 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { fontSize: 12, color: colors.text, width: 56 },
  breakdownBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  breakdownBarFill: { height: 6, borderRadius: 3 },
  breakdownAmount: { fontSize: 12, fontWeight: '700', color: colors.text, width: 64, textAlign: 'right' },
  ticketImage: {
    width: 160,
    height: 160,
    borderRadius: 12,
  },

  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { fontSize: 12, color: colors.text, fontWeight: '600' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 30,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 14, color: colors.text },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },

  disclaimer: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 10,
  },
});
