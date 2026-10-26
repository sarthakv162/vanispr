"""
Pydantic Request & Response Models for AadyaLang SPR Platform
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- Experiment Models ---
class FactorDefinition(BaseModel):
    name: str
    levels: List[str]

class RegionDef(BaseModel):
    index: int
    text: str
    words: List[str]

class ItemVersionInput(BaseModel):
    condition_label: str
    sentence_text: str
    regions: List[RegionDef]

class ItemInput(BaseModel):
    item_number: int
    type: str # 'experimental', 'filler', 'practice'
    question: Optional[str] = None
    correct_answer: Optional[str] = None # 'yes'/'no' or 'haan'/'nahin'
    explanation: Optional[str] = None
    versions: List[ItemVersionInput]

class ExperimentCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    language: str = "hi" # 'hi' or 'en'
    template_type: Optional[str] = "custom"
    factors: List[FactorDefinition] = []
    instructions: Optional[Dict[str, Any]] = None

class ExperimentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    instructions: Optional[Dict[str, Any]] = None

# --- Participant Runner Models ---
class ParticipantInitRequest(BaseModel):
    experiment_id: str
    external_id: Optional[str] = None # Prolific/MTurk PID
    screen_w: int
    screen_h: int
    user_agent: str
    refresh_rate_est: Optional[float] = 60.0
    jitter_ms: Optional[float] = 0.0
    background: Optional[Dict[str, Any]] = None
    trial_mode: Optional[str] = "balanced_8" # 'balanced_8' (4 targets + 4 fillers) or 'full' (all items)

class WordEventInput(BaseModel):
    word_index: int
    region_index: int
    word_text: str
    rt_ms: float
    t_shown: float
    t_pressed: float
    grapheme_count: int
    is_repeat: Optional[bool] = False
    is_outlier: Optional[bool] = False

class TrialSubmitRequest(BaseModel):
    participant_id: str
    item_version_id: str
    presentation_order: int
    started_at: float
    completed_at: float
    question_response: Optional[str] = None
    correct: Optional[int] = None
    question_rt_ms: Optional[float] = None
    focus_lost_count: int = 0
    word_events: List[WordEventInput]

class ParticipantCompleteRequest(BaseModel):
    participant_id: str

# --- Norming Survey Models ---
class NormingRatingSubmit(BaseModel):
    experiment_id: str
    item_version_id: str
    rater_id: str
    rating: int # 1 to 7
    feedback: Optional[str] = None
