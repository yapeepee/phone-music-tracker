import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { useStudentNavigation } from '../../hooks/navigation';
import { createSession, endSession, endAndUpdateSession, selectPiece, clearSelectedPiece } from '../../store/slices/practiceSlice';
import { Tag, PracticeSegment } from '../../types/practice';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Colors } from '../../constants/colors';
import { VideoRecorder } from '../../components/video/VideoRecorder';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { VideoMetadata } from '../../services/video.service';
import { Ionicons } from '@expo/vector-icons';
import { UploadProgress } from '../../components/upload/UploadProgress';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { TagPicker } from '../../components/tags/TagPicker';
import { TagDisplay } from '../../components/tags/TagDisplay';
import { PieceSelector } from '../../components/practice/PieceSelector';
import { CreatePieceModal } from '../../components/practice/CreatePieceModal';
import { PracticeFocusCard } from '../../components/practice/PracticeFocusCard';
// import { AnimatedPracticeFocusCard } from '../../components/practice/AnimatedPracticeFocusCard';
import { SessionSummaryModal } from '../../components/practice/SessionSummaryModal';
import { InlineBPMSelector } from '../../components/practice/InlineBPMSelector';
import { AngryMetronome } from '../../components/practice/AngryMetronome';
import { practiceSegmentService } from '../../services/practice-segment.service';
import { metronomeService } from '../../services/metronome.service';
import { SessionTimer } from '../../components/practice/SessionTimer';
import { timerService } from '../../services/timer.service';
import { tempoService } from '../../services/tempo.service';
import { tempoDetectionService } from '../../services/tempo-detection.service';
import { MeditationMode } from '../../components/practice/MeditationMode';


export const NewSessionScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useStudentNavigation();
  const user = useAppSelector((state) => state.auth.user);
  const currentSession = useAppSelector((state) => state.practice.currentSession);
  const selectedPiece = useAppSelector((state) => state.practice.selectedPiece);
  
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [note, setNote] = useState('');
  const [selfRating, setSelfRating] = useState(3);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<VideoMetadata | null>(null);
  const [videoUploadId, setVideoUploadId] = useState<string | null>(null);
  const [showCreatePieceModal, setShowCreatePieceModal] = useState(false);
  const [practiceSegments, setPracticeSegments] = useState<PracticeSegment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [segmentClicks, setSegmentClicks] = useState<Record<string, number>>({});
  const [showAddFocusModal, setShowAddFocusModal] = useState(false);
  const [newFocusName, setNewFocusName] = useState('');
  const [newFocusDescription, setNewFocusDescription] = useState('');
  const [savingFocus, setSavingFocus] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [sessionEndTime, setSessionEndTime] = useState<string | undefined>(undefined);
  const [targetBPM, setTargetBPM] = useState(100);
  const [practiceMode, setPracticeMode] = useState<'normal' | 'slow_practice' | 'meditation'>('normal');
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerEvents, setTimerEvents] = useState<Array<{ type: 'pause' | 'resume', timestamp: string }>>([]);
  const [tempoPoints, setTempoPoints] = useState(0);
  const [lastTempoCheck, setLastTempoCheck] = useState<number>(0);
  const [detectedTempo, setDetectedTempo] = useState<number>(0);
  const [tempoAccuracy, setTempoAccuracy] = useState<number>(0);
  const { uploads } = useVideoUpload();
  const uploadStatus = uploads.find(u => u.id === videoUploadId);
  
  // Clear selected piece when component unmounts or when navigating away
  React.useEffect(() => {
    return () => {
      // Clear selected piece when leaving the screen
      dispatch(clearSelectedPiece());
    };
  }, [dispatch]);
  
  // Calculate session duration only when currentSession changes
  const sessionDuration = useMemo(() => {
    console.log('Calculating session duration...');
    if (!currentSession?.start_time) {
      console.log('No start time, returning 0');
      return 0;
    }
    try {
      const start = new Date(currentSession.start_time);
      const now = new Date();
      const durationMs = now.getTime() - start.getTime();
      const duration = Math.floor(durationMs / 60000);
      console.log('Duration calculated:', duration);
      return duration;
    } catch (error) {
      console.error('Error calculating session duration:', error);
      return 0;
    }
  }, [currentSession?.start_time]);

  // Auto-activate meditation mode when BPM < 60
  React.useEffect(() => {
    if (targetBPM < 60 && practiceMode !== 'meditation') {
      setPracticeMode('meditation');
    } else if (targetBPM >= 60 && practiceMode === 'meditation') {
      setPracticeMode('slow_practice');
    }
  }, [targetBPM]);

  // Handle metronome and tempo detection start/stop
  React.useEffect(() => {
    if (metronomeEnabled && isSessionActive) {
      // Start metronome with current settings
      metronomeService.start({
        bpm: targetBPM,
        soundEnabled: true,
        hapticEnabled: false, // User doesn't care about vibration
      });
      
      // Start tempo detection
      tempoDetectionService.startDetection(targetBPM).catch(error => {
        console.error('Failed to start tempo detection:', error);
      });
      
      // Subscribe to tempo updates
      const unsubscribe = tempoDetectionService.onTempoDetected((tempo, accuracy) => {
        setDetectedTempo(tempo);
        setTempoAccuracy(accuracy);
      });
      
      return () => {
        metronomeService.stop();
        tempoDetectionService.stopDetection();
        unsubscribe();
      };
    } else {
      // Stop metronome and tempo detection
      metronomeService.stop();
      tempoDetectionService.stopDetection();
      setDetectedTempo(0);
      setTempoAccuracy(0);
    }

    // Cleanup on unmount
    return () => {
      metronomeService.stop();
      tempoDetectionService.stopDetection();
    };
  }, [metronomeEnabled, isSessionActive, targetBPM]);

  // Track tempo and accumulate points
  React.useEffect(() => {
    if (!metronomeEnabled || !isSessionActive || !currentSession?.id) {
      return;
    }

    // Track tempo every 5 seconds
    const tempoTrackingInterval = setInterval(async () => {
      try {
        // Use detected tempo if available, otherwise use target tempo
        const actualTempo = detectedTempo > 0 ? detectedTempo : targetBPM;
        const isUnderTempo = actualTempo <= targetBPM;
        
        // Calculate if user is significantly under tempo (20% or more)
        const tempoDiffPercent = ((targetBPM - actualTempo) / targetBPM) * 100;
        
        // Record tempo entry
        const response = await tempoService.recordTempoEntry(currentSession.id, {
          actual_tempo: actualTempo,
          target_tempo: targetBPM,
          is_under_tempo: isUnderTempo
        });
        
        // Update points - accumulate the points earned
        if (response.points_earned > 0) {
          setTempoPoints(prevPoints => prevPoints + response.points_earned);
        }
        
        // Update last check time
        setLastTempoCheck(Date.now());
        
        console.log(`Tempo tracked: ${actualTempo}/${targetBPM} BPM, Points earned: ${response.points_earned}`);
      } catch (error) {
        console.error('Failed to track tempo:', error);
        // Continue tracking even if one entry fails
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(tempoTrackingInterval);
    };
  }, [metronomeEnabled, isSessionActive, currentSession?.id, targetBPM, practiceMode]);

  // Create timer when session becomes active
  React.useEffect(() => {
    if (isSessionActive && currentSession?.id && timerSeconds === 0) {
      timerService.createSessionTimer(currentSession.id, {
        session_id: currentSession.id,
        total_seconds: 0,
        is_paused: false,
        events: [{
          event_type: 'start',
          event_timestamp: new Date().toISOString()
        }]
      }).catch(error => {
        console.error('Failed to create timer:', error);
        // Continue even if timer creation fails
      });
    }
  }, [isSessionActive, currentSession?.id]);

  const handleTimerUpdate = async (totalSeconds: number, isPaused: boolean) => {
    setTimerSeconds(totalSeconds);
    
    // Track pause/resume events
    if (isPaused !== timerPaused) {
      setTimerPaused(isPaused);
      const eventType = isPaused ? 'pause' : 'resume';
      const eventTimestamp = new Date().toISOString();
      
      setTimerEvents(prev => [...prev, {
        type: eventType,
        timestamp: eventTimestamp
      }]);
      
      // Save event to backend
      if (currentSession?.id) {
        try {
          await timerService.addTimerEvent(currentSession.id, {
            event_type: eventType,
            event_timestamp: eventTimestamp
          });
          
          // Update timer total seconds
          await timerService.updateSessionTimer(currentSession.id, {
            total_seconds: totalSeconds,
            is_paused: isPaused
          });
        } catch (error) {
          console.error('Failed to save timer event:', error);
          // Continue even if save fails
        }
      }
    } else if (totalSeconds % 10 === 0 && totalSeconds > 0) {
      // Update total seconds every 10 seconds
      if (currentSession?.id) {
        timerService.updateSessionTimer(currentSession.id, {
          total_seconds: totalSeconds,
          is_paused: isPaused
        }).catch(error => {
          console.error('Failed to update timer:', error);
        });
      }
    }
  };

  const handleSelectPiece = async (piece: Tag) => {
    dispatch(selectPiece(piece));
    
    // Auto-add default focus tags based on piece
    const defaultTags: Tag[] = [
      { id: '1', name: 'Technique', color: '#5856D6', created_at: '', updated_at: '' },
      { id: '2', name: 'Musicality', color: '#007AFF', created_at: '', updated_at: '' },
    ];
    setSelectedTags(defaultTags);
    
    // Load practice segments for this piece
    setLoadingSegments(true);
    try {
      const segments = await practiceSegmentService.getPieceSegments(piece.id);
      setPracticeSegments(segments);
      // Initialize click counts for today
      const initialClicks: Record<string, number> = {};
      segments.forEach(segment => {
        initialClicks[segment.id] = 0;
      });
      setSegmentClicks(initialClicks);
    } catch (error) {
      console.error('Failed to load practice segments:', error);
      // Continue without segments if loading fails
    } finally {
      setLoadingSegments(false);
    }
  };

  const handleCreatePiece = () => {
    setShowCreatePieceModal(true);
  };

  const handlePieceCreated = async (createdPiece: Tag) => {
    console.log('[NewSessionScreen] handlePieceCreated called with:', createdPiece);
    // The modal has created the piece, now select it
    // Note: New pieces won't have segments yet
    setPracticeSegments([]);
    setSegmentClicks({});
    handleSelectPiece(createdPiece);
  };

  const handleStartSession = async () => {
    if (!user?.id || !selectedPiece) return;

    try {
      await dispatch(createSession({
        studentId: user.id,
        tags: selectedTags?.map(tag => tag.name) || [],
        targetTempo: targetBPM,
        practiceMode: practiceMode,
      })).unwrap();
      
      setIsSessionActive(true);
      setTempoPoints(0); // Reset tempo points for new session
    } catch (error) {
      Alert.alert('Error', 'Failed to create session. Please check your internet connection.');
      console.error('Failed to create session:', error);
    }
  };

  const handleEndSession = () => {
    console.log('handleEndSession called');
    console.log('currentSession:', currentSession);
    console.log('Modal states:', {
      showVideoRecorder,
      showAddFocusModal,
      showCreatePieceModal,
      showSummaryModal
    });
    
    if (!currentSession) {
      console.log('No current session, returning');
      return;
    }
    
    // Make sure other modals are closed
    setShowVideoRecorder(false);
    setShowAddFocusModal(false);
    setShowCreatePieceModal(false);
    
    // Set the end time for the session
    const endTime = new Date().toISOString();
    setSessionEndTime(endTime);
    
    // Add delay before opening summary modal
    setTimeout(() => {
      console.log('Showing summary modal');
      setShowSummaryModal(true);
    }, 100);
  };

  const handleConfirmEndSession = async () => {
    console.log('handleConfirmEndSession START');
    if (!currentSession) {
      console.log('No current session, returning');
      return;
    }
    
    console.log('Closing modals...');
    // Close the summary modal
    setShowSummaryModal(false);
    setSessionEndTime(undefined);
    
    // Stop metronome if running
    metronomeService.stop();
    setMetronomeEnabled(false);
    
    // Save final timer state
    if (currentSession?.id && timerSeconds > 0) {
      try {
        await timerService.updateSessionTimer(currentSession.id, {
          total_seconds: timerSeconds,
          is_paused: false
        });
        
        // Add stop event
        await timerService.addTimerEvent(currentSession.id, {
          event_type: 'stop',
          event_timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to save final timer state:', error);
        // Continue even if save fails
      }
    }
    
    console.log('About to dispatch endSession');
    console.log('Payload:', {
      selfRating,
      note,
      tagsLength: selectedTags?.length,
      hasVideo: !!recordedVideo,
      videoUploadId
    });
    
    try {
      // First, end the session locally
      dispatch(endSession({
        selfRating,
        note,
        tags: selectedTags?.map(tag => tag.name) || [],
        video: recordedVideo || undefined,
        videoUploadId: videoUploadId || undefined,
      }));
      
      // Log current session details
      if (__DEV__) {
        console.log('Current session details:', {
          id: currentSession.id,
          fullSession: JSON.stringify(currentSession, null, 2)
        });
      }
      
      // Update session on backend
      const result = await dispatch(endAndUpdateSession({
        sessionId: currentSession.id,
        selfRating,
        note,
        tags: selectedTags?.map(tag => tag.name) || [],
        video: recordedVideo || undefined,
        videoUploadId: videoUploadId || undefined,
      })).unwrap();
      
      console.log('Session end result:', result);
      
      Alert.alert(
        'Session Saved',
        'Your practice session has been saved successfully!',
        [{ text: 'OK', onPress: () => {
          console.log('Alert OK pressed, navigating back');
          // Clear selected piece before navigating back
          dispatch(clearSelectedPiece());
          navigation.goBack();
        }}]
      );
    } catch (error) {
      console.error('Error in handleConfirmEndSession:', error);
      Alert.alert('Error', 'Failed to save session. Please try again.');
    }
    
    console.log('handleConfirmEndSession END');
    
    // Reset session state
    setIsSessionActive(false);
    setSelectedTags([]);
    setNote('');
    setSelfRating(3);
    setRecordedVideo(null);
    setVideoUploadId(null);
    setPracticeSegments([]);
    setSegmentClicks({});
    setTargetBPM(100);
    setPracticeMode('normal');
    setMetronomeEnabled(false);
    setTimerSeconds(0);
    setTimerPaused(false);
    setTimerEvents([]);
    setTempoPoints(0);
  };


  const handleVideoRecorded = (video: VideoMetadata, uploadId?: string) => {
    setRecordedVideo(video);
    setShowVideoRecorder(false);
    if (uploadId) {
      setVideoUploadId(uploadId);
    }
  };

  const handleDeleteVideo = () => {
    setRecordedVideo(null);
  };

  const openVideoRecorder = () => {
    if (!currentSession) {
      Alert.alert('Start Session First', 'Please start a practice session before recording a video.');
      return;
    }
    setShowVideoRecorder(true);
  };

  const handleSegmentClick = async (segment: PracticeSegment) => {
    // Increment local click count for today
    const newClicks = {
      ...segmentClicks,
      [segment.id]: (segmentClicks[segment.id] || 0) + 1
    };
    setSegmentClicks(newClicks);
    
    // Record click to backend if session is active
    if (currentSession) {
      try {
        const clickResult = await practiceSegmentService.recordSegmentClick({
          segment_id: segment.id,
          session_id: currentSession.id,
          click_count: 1
        });
        
        // After successful click, refetch the segment to get updated total_click_count
        // The database trigger updates this automatically
        const segments = await practiceSegmentService.getPieceSegments(selectedPiece!.id);
        setPracticeSegments(segments);
      } catch (error) {
        console.error('Failed to record segment click:', error);
        // Revert the today's click count on failure
        setSegmentClicks({
          ...segmentClicks,
          [segment.id]: (segmentClicks[segment.id] || 0)
        });
      }
    }
  };

  const handleSegmentComplete = async (segment: PracticeSegment) => {
    try {
      const updatedSegment = await practiceSegmentService.updateSegment(segment.id, {
        is_completed: !segment.is_completed
      });
      
      // Update local segments state
      setPracticeSegments(prevSegments => 
        prevSegments.map(s => 
          s.id === segment.id ? { ...s, is_completed: updatedSegment.is_completed } : s
        )
      );
    } catch (error) {
      console.error('Failed to update segment completion:', error);
      Alert.alert('Error', 'Failed to update focus completion status');
    }
  };

  const handleAddFocus = async () => {
    if (!newFocusName.trim()) {
      Alert.alert('Error', 'Please enter a focus name.');
      return;
    }

    if (!selectedPiece) return;

    setSavingFocus(true);
    try {
      const newSegment = await practiceSegmentService.createSegment({
        piece_tag_id: selectedPiece.id,
        name: newFocusName.trim(),
        description: newFocusDescription.trim() || undefined,
        display_order: practiceSegments.length
      });
      
      setPracticeSegments(prev => [...prev, newSegment]);
      setSegmentClicks(prev => ({ ...prev, [newSegment.id]: 0 }));
      setShowAddFocusModal(false);
      setNewFocusName('');
      setNewFocusDescription('');
    } catch (error) {
      console.error('Failed to create focus:', error);
      Alert.alert('Error', 'Failed to create focus. Please try again.');
    } finally {
      setSavingFocus(false);
    }
  };

  return (
    <>
      {/* Meditation Mode Overlay */}
      <MeditationMode 
        bpm={targetBPM} 
        isActive={metronomeEnabled && practiceMode === 'meditation' && isSessionActive} 
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isSessionActive ? 'Practice Session Active' : 'New Practice Session'}
          </Text>
        </View>

      {!isSessionActive ? (
        !selectedPiece ? (
          // Step 1: Select a piece
          <PieceSelector
            onSelectPiece={handleSelectPiece}
            onCreatePiece={handleCreatePiece}
          />
        ) : (
          // Step 2: Show selected piece and start session
          <>
            <View style={styles.selectedPieceCard}>
              <View style={styles.pieceInfoSection}>
                <Text style={styles.pieceLabel}>Selected Piece</Text>
                <Text style={styles.selectedPieceName}>{selectedPiece.name}</Text>
                {selectedPiece.composer && (
                  <Text style={styles.selectedPieceComposer}>{selectedPiece.composer}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => dispatch(clearSelectedPiece())}
                style={styles.changePieceButton}
              >
                <Text style={styles.changePieceText}>Change</Text>
              </TouchableOpacity>
            </View>


            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tags</Text>
                <TouchableOpacity
                  style={styles.selectTagsButton}
                  onPress={() => setShowTagPicker(true)}
                >
                  <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                  <Text style={styles.selectTagsText}>Add Tags</Text>
                </TouchableOpacity>
              </View>
              <TagDisplay
                tags={selectedTags}
                onTagRemove={(tag) => setSelectedTags(selectedTags.filter(t => t.id !== tag.id))}
                emptyMessage="Add tags to categorize your practice"
                size="medium"
              />
            </View>

            <Button
              title="Start Session"
              onPress={handleStartSession}
              size="large"
              style={styles.startButton}
            />
          </>
        )
      ) : (
        <>
          <View style={styles.activeSession}>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionInfoLabel}>Duration:</Text>
              <Text style={styles.sessionInfoValue}>
                {currentSession && new Date().getTime() - new Date(currentSession.startTime).getTime() > 0
                  ? `${Math.floor((new Date().getTime() - new Date(currentSession.startTime).getTime()) / 60000)} min`
                  : '0 min'}
              </Text>
            </View>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionInfoLabel}>Piece:</Text>
              <Text style={styles.sessionInfoValue}>
                {selectedPiece?.name || 'No piece selected'}
              </Text>
            </View>
          </View>

          {/* Metronome Control */}
          <View style={styles.section}>
            <View style={styles.metronomeHeader}>
              <Text style={styles.sectionTitle}>Metronome</Text>
              <TouchableOpacity
                style={[
                  styles.metronomeToggle,
                  metronomeEnabled && styles.metronomeToggleActive
                ]}
                onPress={() => setMetronomeEnabled(!metronomeEnabled)}
              >
                <Ionicons 
                  name={metronomeEnabled ? "pause" : "play"} 
                  size={20} 
                  color={metronomeEnabled ? Colors.surface : Colors.primary} 
                />
                <Text style={[
                  styles.metronomeToggleText,
                  metronomeEnabled && styles.metronomeToggleTextActive
                ]}>
                  {metronomeEnabled ? 'On' : 'Off'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {metronomeEnabled && (
              <>
                <AngryMetronome
                  targetTempo={targetBPM}
                  actualTempo={detectedTempo > 0 ? detectedTempo : targetBPM}
                  isPlaying={metronomeEnabled}
                  onTempoChange={(tempo) => setTargetBPM(tempo)}
                  accuracy={tempoAccuracy}
                />
                <View style={styles.bpmSelectorContainer}>
                  <InlineBPMSelector
                    value={targetBPM}
                    onChange={(bpm) => {
                      setTargetBPM(bpm);
                      metronomeService.updateOptions({ bpm });
                    }}
                    practiceMode={practiceMode}
                    onPracticeModeChange={setPracticeMode}
                  />
                  <Text style={styles.metronomeNote}>
                    {detectedTempo > 0 ? (
                      <>
                        Detected: {detectedTempo} BPM • Accuracy: {tempoAccuracy}%
                      </>
                    ) : (
                      'Listening for your tempo...'
                    )}
                  </Text>
                  
                  {/* Tempo Points Display */}
                  {tempoPoints > 0 && (
                    <View style={styles.tempoPointsContainer}>
                      <View style={styles.tempoPointsBadge}>
                        <Ionicons name="star" size={20} color={Colors.warning} />
                        <Text style={styles.tempoPointsText}>
                          {tempoPoints} {tempoPoints === 1 ? 'Point' : 'Points'} Earned!
                        </Text>
                      </View>
                      <Text style={styles.tempoPointsSubtext}>
                        Keep playing under tempo to earn more points
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Session Timer */}
          <SessionTimer 
            isSessionActive={isSessionActive}
            onTimerUpdate={handleTimerUpdate}
          />

          {/* Practice Focuses Section */}
          {selectedPiece && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Practice Focuses</Text>
                <View style={styles.pieceIndicator}>
                  <Text style={styles.pieceIndicatorText}>{selectedPiece.name}</Text>
                </View>
              </View>
              
              {loadingSegments ? (
                <Text style={styles.loadingText}>Loading practice focuses...</Text>
              ) : (
                <View style={styles.goalsContainer}>
                  {practiceSegments && practiceSegments.length > 0 ? (
                    practiceSegments.map((segment) => (
                      <PracticeFocusCard
                        key={segment.id}
                        focus={segment}
                        todayClicks={segmentClicks[segment.id] || 0}
                        onPress={() => handleSegmentClick(segment)}
                        onLongPress={() => handleSegmentComplete(segment)}
                      />
                    ))
                  ) : null}
                  <TouchableOpacity 
                    style={styles.addFocusButton}
                    onPress={() => setShowAddFocusModal(true)}
                  >
                    <Ionicons name="add-circle" size={32} color={Colors.primary} />
                    <Text style={styles.addFocusText}>Add New Focus</Text>
                  </TouchableOpacity>
                  {practiceSegments.length > 0 && (
                    <Text style={styles.focusHint}>
                      Tap to track practice • Long press to mark complete
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Self Rating</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    selfRating === rating && styles.ratingButtonActive,
                  ]}
                  onPress={() => setSelfRating(rating)}
                >
                  <Text
                    style={[
                      styles.ratingText,
                      selfRating === rating && styles.ratingTextActive,
                    ]}
                  >
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Notes</Text>
            <Input
              placeholder="Add notes about your practice..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              style={styles.notesInput}
            />
          </View>

          {recordedVideo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recorded Video</Text>
              <VideoPlayer
                video={recordedVideo}
                showControls={true}
                autoPlay={false}
                onDelete={handleDeleteVideo}
              />
              {uploadStatus && uploadStatus.status !== 'completed' && uploadStatus.status !== 'cancelled' && (
                <View style={styles.uploadProgressWrapper}>
                  <UploadProgress
                    fileName={uploadStatus.fileName}
                    progress={uploadStatus.progress}
                    bytesUploaded={uploadStatus.bytesUploaded}
                    bytesTotal={uploadStatus.bytesTotal}
                    speed={uploadStatus.speed}
                    status={uploadStatus.status}
                    error={uploadStatus.error}
                  />
                </View>
              )}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button
              title="End Session"
              onPress={handleEndSession}
              size="large"
              variant="primary"
            />
            <Button
              title={recordedVideo ? "Re-record Video" : "Record Video"}
              onPress={openVideoRecorder}
              size="large"
              variant="outline"
              style={styles.recordButton}
            />
          </View>
        </>
      )}
      </ScrollView>

      <Modal
        visible={showVideoRecorder}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <VideoRecorder
          sessionId={currentSession?.id || ''}
          maxDuration={300}
          onVideoRecorded={handleVideoRecorded}
          onCancel={() => setShowVideoRecorder(false)}
        />
      </Modal>

      <TagPicker
        visible={showTagPicker}
        onClose={() => setShowTagPicker(false)}
        onSelectTags={setSelectedTags}
        selectedTags={selectedTags}
        allowCreate={false}
      />

      <CreatePieceModal
        visible={showCreatePieceModal}
        onClose={() => setShowCreatePieceModal(false)}
        onPieceCreated={handlePieceCreated}
      />

      <Modal
        visible={showAddFocusModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddFocusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Practice Focus</Text>
              <TouchableOpacity onPress={() => setShowAddFocusModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <Input
              label="Focus Name"
              placeholder="e.g., Right hand sing more on second movement"
              value={newFocusName}
              onChangeText={setNewFocusName}
              style={styles.modalInput}
            />
            
            <Input
              label="Description (optional)"
              placeholder="Additional notes about this focus"
              value={newFocusDescription}
              onChangeText={setNewFocusDescription}
              multiline
              numberOfLines={3}
              style={styles.modalInput}
            />
            
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowAddFocusModal(false);
                  setNewFocusName('');
                  setNewFocusDescription('');
                }}
                style={styles.modalButton}
              />
              <Button
                title="Add Focus"
                onPress={handleAddFocus}
                loading={savingFocus}
                disabled={!newFocusName.trim() || savingFocus}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {showSummaryModal && currentSession && (
        <SessionSummaryModal
          visible={showSummaryModal}
          onClose={() => {
            console.log('Modal onClose called');
            setShowSummaryModal(false);
            setSessionEndTime(undefined);
          }}
          onConfirm={() => {
            console.log('Modal onConfirm called');
            handleConfirmEndSession();
          }}
          sessionDuration={sessionDuration}
          practiceSegments={practiceSegments || []}
          segmentClicks={segmentClicks || {}}
          sessionStartTime={currentSession.start_time}
          sessionEndTime={sessionEndTime || ''}
          timerSeconds={timerSeconds}
          timerEvents={timerEvents}
          tempoPoints={tempoPoints}
          sessionId={currentSession.id}
          selectedPiece={selectedPiece}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectTagsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectTagsText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  addTagButton: {
    width: 80,
  },
  startButton: {
    marginHorizontal: 24,
    marginBottom: 48,
  },
  activeSession: {
    backgroundColor: Colors.primary + '10',
    padding: 20,
    marginHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionInfoLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  sessionInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  ratingButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  ratingTextActive: {
    color: Colors.surface,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  recordButton: {
    marginTop: 12,
  },
  uploadProgressWrapper: {
    marginTop: 12,
  },
  selectedPieceCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  pieceInfoSection: {
    flex: 1,
  },
  pieceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  selectedPieceName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  selectedPieceComposer: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  changePieceButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  changePieceText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  pieceIndicator: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pieceIndicatorText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  goalsContainer: {
    marginTop: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: 20,
  },
  focusHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  addFocusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
  },
  addFocusText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalInput: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 6,
  },
  metronomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metronomeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  metronomeToggleActive: {
    backgroundColor: Colors.primary,
  },
  metronomeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  metronomeToggleTextActive: {
    color: Colors.surface,
  },
  metronomeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  metronomeInfoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  bpmSelectorContainer: {
    marginTop: 20,
  },
  metronomeNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  tempoPointsContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  tempoPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
  },
  tempoPointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warning,
  },
  tempoPointsSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});