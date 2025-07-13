# 🎼 Practice Goals Implementation Plan

## Overview
Transform the practice session experience to be piece-centric with trackable practice goals/reminders that users click during practice to track their focus areas.

## Core Concept
- **Practice Goals** = Specific reminders like "right hand sing more on second movement"
- **NOT** piece sections, but practice techniques/focus areas
- Click tracking shows what you practiced and how many times
- Visual feedback and completion tracking

## User Flow

### 1. Starting a Practice Session
```
User opens app
  ↓
Tap "Start Practice Session"
  ↓
See list of pieces (not focus areas)
  ↓
Select piece OR create new
  ↓
System auto-adds default tags (Technique, Musicality, etc.)
  ↓
Begin practice with clickable goals
```

### 2. First-Time Piece Practice
```
Select "Create New Piece"
  ↓
Enter piece details (name, composer, difficulty)
  ↓
Prompted: "What do you want to work on?"
  ↓
Add practice goals (min 1 required)
  ↓
Start practicing with goals visible
```

### 3. Returning to a Piece
```
Select existing piece
  ↓
See all practice goals
  ↓
Previously completed goals show as crossed out
  ↓
Active goals show click counts
  ↓
Click goals as you practice them
```

## Technical Implementation

### Phase 1: Database & Model Updates ✅ COMPLETED
- Modified `practice_segments` to store practice goals
- Created mock data with real musical pieces
- Added sample practice goals for each piece

### Phase 2: UI Component Structure ✅ COMPLETED

#### 2.1 PieceSelector Component ✅ COMPLETED
```typescript
interface PieceSelectorProps {
  onSelectPiece: (piece: Tag) => void;
  onCreatePiece: () => void;
}

// Features implemented:
- Search bar at top ✅
- ScrollView with piece cards ✅
- Each card shows:
  - Piece name (large) ✅
  - Composer (small, gray) ✅
  - Difficulty badge ✅
  - Last practiced indicator ❌ (pending - needs practice data)
  - Progress bar (completed goals %) ❌ (pending - needs segment data)
- "Create New Piece" button at bottom ✅
- Recently practiced pieces at top ❌ (pending - needs practice data)
```

#### 2.2 CreatePieceModal Component ✅ COMPLETED
```typescript
interface CreatePieceModalProps {
  visible: boolean;
  onClose: () => void;
  onCreatePiece: (piece: TagCreate) => void;
}

// Form fields implemented:
- Piece Name* (TextInput) ✅
- Composer (TextInput) ✅
- Opus/Number (TextInput) ✅
- Difficulty (Slider 1-10) ✅
- Color selection (for visual identification) ✅
```

#### 2.3 AddPracticeGoalsScreen
```typescript
interface AddPracticeGoalsScreenProps {
  piece: Tag;
  onComplete: (goals: string[]) => void;
}

// Features:
- Header: "What do you want to work on in {piece.name}?"
- Goal input with "Add" button
- List of added goals (deletable)
- Suggested goals based on difficulty
- "Start Practicing" button (min 1 goal)
```

#### 2.4 PracticeGoalCard Component
```typescript
interface PracticeGoalCardProps {
  goal: PracticeSegment;
  todayClicks: number;
  onPress: () => void;
  onLongPress: () => void;
}

// Visual design:
- Card with subtle shadow
- Goal text (can be multi-line)
- Click counter badge (shows today/total)
- Completion checkmark if done
- Press animation (scale + color)
- Long press shows options menu
```

### Phase 3: State Management

#### 3.1 Redux State Updates
```typescript
interface PracticeState {
  currentSession: PracticeSession | null;
  selectedPiece: Tag | null;  // NEW
  practiceGoals: PracticeSegment[];  // NEW
  todayClicks: Record<string, number>;  // NEW: goal_id -> count
  // ... existing fields
}
```

#### 3.2 New Actions
- `selectPracticepiece(piece: Tag)`
- `loadPracticeGoals(pieceId: string)`
- `incrementGoalClick(goalId: string)`
- `markGoalComplete(goalId: string)`
- `createPracticeGoal(goal: CreatePracticeSegmentInput)`

### Phase 4: NewSessionScreen Restructure ✅ COMPLETED

#### 4.1 Screen States ✅ COMPLETED
1. **Piece Selection State** (initial) ✅
   - Show PieceSelector ✅
   - No bottom buttons yet ✅

2. **Piece Selected State** ✅
   - Show selected piece header ✅
   - Auto-added focus tags visible ✅
   - "Start Session" button appears ✅

3. **Session Active State** ✅ COMPLETED
   - Timer running ✅ (existing)
   - Practice goals clickable ✅ COMPLETED
   - "End Session" button ✅ (existing)

#### 4.2 Layout Structure
```
<ScrollView>
  {!selectedPiece && (
    <PieceSelector
      onSelectPiece={handleSelectPiece}
      onCreatePiece={() => setShowCreateModal(true)}
    />
  )}
  
  {selectedPiece && !isSessionActive && (
    <>
      <PieceHeader piece={selectedPiece} />
      <TagDisplay tags={defaultTags} />
      <Button title="Start Session" onPress={startSession} />
    </>
  )}
  
  {isSessionActive && (
    <>
      <SessionTimer startTime={session.start_time} />
      <PieceHeader piece={selectedPiece} />
      <PracticeGoalsSection
        goals={practiceGoals}
        onGoalClick={handleGoalClick}
        onGoalComplete={handleGoalComplete}
      />
      <Button title="End Session" onPress={endSession} />
    </>
  )}
</ScrollView>
```

### Phase 5: Animations & Micro-interactions

#### 5.1 Click Animation
```typescript
// Using Animated API (no reanimated needed)
const animateClick = () => {
  Animated.sequence([
    Animated.spring(scaleValue, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }),
    Animated.spring(scaleValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }),
  ]).start();
  
  // Color pulse
  Animated.sequence([
    Animated.timing(colorValue, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }),
    Animated.timing(colorValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }),
  ]).start();
};
```

#### 5.2 Completion Animation
- Strikethrough line animation
- Checkmark fade in
- Card opacity to 0.7
- Disable further clicks

#### 5.3 Counter Animation
- Number change with slight scale
- Color change on milestone (5, 10, 20 clicks)

### Phase 6: Practice Overview Screen

#### 6.1 Screen Sections
1. **Active Pieces** (pieces with incomplete goals)
2. **Completed Pieces** (all goals done)
3. **Statistics**
   - Total practice time this week
   - Most practiced piece
   - Streak information

#### 6.2 Piece Card Design
```
┌─────────────────────────────────┐
│ 🎼 Moonlight Sonata             │
│ Beethoven Op. 27 No. 2          │
│                                 │
│ ████████████░░░░  75% Complete  │
│ 3/4 goals completed             │
│                                 │
│ Last: 2 hours ago               │
└─────────────────────────────────┘
```

### Phase 7: Data Persistence

#### 7.1 API Calls
- Load pieces: `GET /tags?tag_type=piece`
- Load goals: `GET /practice-segments/pieces/{id}/segments`
- Create piece: `POST /tags` with tag_type='piece'
- Create goal: `POST /practice-segments/segments`
- Track click: `POST /practice-segments/segments/click`
- Mark complete: `PUT /practice-segments/segments/{id}`

#### 7.2 Offline Support
- Cache pieces and goals locally
- Queue click events when offline
- Sync when connection restored

## Implementation Order

1. **Day 1: PieceSelector & CreatePieceModal**
   - Build UI components
   - Connect to existing tag service
   - Test with mock data

2. **Day 2: Restructure NewSessionScreen**
   - Implement piece selection flow
   - Update state management
   - Connect practice goals

3. **Day 3: Practice Goals UI**
   - Build PracticeGoalCard
   - Implement click tracking
   - Add completion functionality

4. **Day 4: Animations & Polish**
   - Add micro-interactions
   - Implement animations
   - Visual feedback

5. **Day 5: Practice Overview**
   - Build overview screen
   - Add statistics
   - Final testing

## Success Metrics

1. **User can create a new piece and add practice goals**
2. **Practice sessions start with piece selection**
3. **Goals are clickable with visual feedback**
4. **Click counts persist between sessions**
5. **Completed goals show strikethrough**
6. **Overview shows practice patterns**

## Edge Cases to Handle

1. **No pieces exist** → Show welcome message
2. **No goals for piece** → Prompt to add goals
3. **All goals completed** → Suggest reviewing or adding new goals
4. **Offline mode** → Queue clicks for later sync
5. **Very long goal text** → Proper text wrapping

## Testing Checklist

- [ ] Create new piece flow
- [ ] Add multiple practice goals
- [ ] Click goals during practice
- [ ] Complete goals (long press)
- [ ] View practice overview
- [ ] Check data persistence
- [ ] Test offline mode
- [ ] Verify animations work smoothly