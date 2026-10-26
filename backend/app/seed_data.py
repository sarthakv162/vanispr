"""
Seed Data Generator for AadyaLang SPR Platform
Populates:
1. Gibson & Warren (2004) English Benchmark Experiment (2x2 Design).
2. Hindi SOV Relative-Correlative Psycholinguistic Experiment (2x2 Design).
3. 12 Balanced Pilot Participants demonstrating residual RT interaction at Region 5.
"""
import uuid
import json
import random
from app.database import get_db
from app.latin_square import generate_latin_square_lists

def seed_database():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if already seeded
        cursor.execute("SELECT COUNT(*) as count FROM experiments")
        if cursor.fetchone()["count"] > 0:
            print("Database already contains experiments. Skipping seed.")
            return

        # 1. Create Default Host
        host_id = "host_sarthak_001"
        cursor.execute("""
        INSERT INTO hosts (id, email, name)
        VALUES (?, ?, ?)
        """, (host_id, "sarthak@aadyalang.org", "Dr. Sarthak Verma"))

        # -------------------------------------------------------------
        # EXPERIMENT 1: Gibson & Warren (2004) English Benchmark
        # -------------------------------------------------------------
        exp1_id = "exp_gibson_warren_2004"
        exp1_factors = [
            {"name": "extraction", "levels": ["+extract", "-extract"]},
            {"name": "phrase_type", "levels": ["VP", "NP"]}
        ]
        exp1_instructions = {
            "title": "Self-Paced Reading Experiment",
            "body": "In this experiment, you will read sentences one word at a time. Press the SPACEBAR to reveal each word and advance through the sentence. After each sentence, answer the yes/no comprehension question using the 'F' key (Yes) or 'J' key (No)."
        }

        cursor.execute("""
        INSERT INTO experiments (id, host_id, title, description, language, status, template_type, version, design_json, instructions_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            exp1_id, host_id,
            "English Gibson & Warren (2004) Benchmark",
            "Direct replication of the 2x2 filler-gap dependency vs intermediate phrase type paradigm (Syntax 7:1, 55-78).",
            "en", "live", "gibson_warren_2x2", 1,
            json.dumps(exp1_factors),
            json.dumps(exp1_instructions)
        ))

        # Factors
        for f in exp1_factors:
            cursor.execute("INSERT INTO factors (id, experiment_id, name, levels_json) VALUES (?, ?, ?, ?)",
                           (str(uuid.uuid4()), exp1_id, f["name"], json.dumps(f["levels"])))

        # Items for Experiment 1
        exp1_raw_items = [
            {
                "item_number": 1,
                "type": "experimental",
                "question": "Did the proposal please the consultant?",
                "correct_answer": "yes",
                "explanation": "The text states that the proposal had pleased the consultant.",
                "versions": [
                    {
                        "condition_label": "+extract_VP",
                        "sentence_text": "The manager who the consultant claimed that the new proposal had pleased will hire five workers tomorrow.",
                        "regions": [
                            {"index": 1, "text": "The manager who", "words": ["The", "manager", "who"]},
                            {"index": 2, "text": "the consultant", "words": ["the", "consultant"]},
                            {"index": 3, "text": "claimed that", "words": ["claimed", "that"]},
                            {"index": 4, "text": "the new proposal", "words": ["the", "new", "proposal"]},
                            {"index": 5, "text": "had pleased", "words": ["had", "pleased"]},
                            {"index": 6, "text": "will hire", "words": ["will", "hire"]},
                            {"index": 7, "text": "five workers tomorrow.", "words": ["five", "workers", "tomorrow."]}
                        ]
                    },
                    {
                        "condition_label": "+extract_NP",
                        "sentence_text": "The manager who the consultant's claim about the new proposal had pleased will hire five workers tomorrow.",
                        "regions": [
                            {"index": 1, "text": "The manager who", "words": ["The", "manager", "who"]},
                            {"index": 2, "text": "the consultant's", "words": ["the", "consultant's"]},
                            {"index": 3, "text": "claim about", "words": ["claim", "about"]},
                            {"index": 4, "text": "the new proposal", "words": ["the", "new", "proposal"]},
                            {"index": 5, "text": "had pleased", "words": ["had", "pleased"]},
                            {"index": 6, "text": "will hire", "words": ["will", "hire"]},
                            {"index": 7, "text": "five workers tomorrow.", "words": ["five", "workers", "tomorrow."]}
                        ]
                    },
                    {
                        "condition_label": "-extract_VP",
                        "sentence_text": "The consultant claimed that the new proposal had pleased the manager who will hire five workers tomorrow.",
                        "regions": [
                            {"index": 1, "text": "The consultant", "words": ["The", "consultant"]},
                            {"index": 2, "text": "claimed that", "words": ["claimed", "that"]},
                            {"index": 3, "text": "that the", "words": ["that", "the"]},
                            {"index": 4, "text": "new proposal", "words": ["new", "proposal"]},
                            {"index": 5, "text": "had pleased", "words": ["had", "pleased"]},
                            {"index": 6, "text": "the manager who", "words": ["the", "manager", "who"]},
                            {"index": 7, "text": "will hire five workers tomorrow.", "words": ["will", "hire", "five", "workers", "tomorrow."]}
                        ]
                    },
                    {
                        "condition_label": "-extract_NP",
                        "sentence_text": "The consultant's claim about the new proposal had pleased the manager who will hire five workers tomorrow.",
                        "regions": [
                            {"index": 1, "text": "The consultant's", "words": ["The", "consultant's"]},
                            {"index": 2, "text": "claim about", "words": ["claim", "about"]},
                            {"index": 3, "text": "about the", "words": ["about", "the"]},
                            {"index": 4, "text": "new proposal", "words": ["new", "proposal"]},
                            {"index": 5, "text": "had pleased", "words": ["had", "pleased"]},
                            {"index": 6, "text": "the manager who", "words": ["the", "manager", "who"]},
                            {"index": 7, "text": "will hire five workers tomorrow.", "words": ["will", "hire", "five", "workers", "tomorrow."]}
                        ]
                    }
                ]
            },
            {
                "item_number": 2,
                "type": "experimental",
                "question": "Did the musician entertain the audience?",
                "correct_answer": "yes",
                "explanation": "The audience was entertained by the performance.",
                "versions": [
                    {
                        "condition_label": "+extract_VP",
                        "sentence_text": "The singer who the producer believed that the acoustic melody had captivated will sign the contract soon.",
                        "regions": [
                            {"index": 1, "text": "The singer who", "words": ["The", "singer", "who"]},
                            {"index": 2, "text": "the producer", "words": ["the", "producer"]},
                            {"index": 3, "text": "believed that", "words": ["believed", "that"]},
                            {"index": 4, "text": "the acoustic melody", "words": ["the", "acoustic", "melody"]},
                            {"index": 5, "text": "had captivated", "words": ["had", "captivated"]},
                            {"index": 6, "text": "will sign", "words": ["will", "sign"]},
                            {"index": 7, "text": "the contract soon.", "words": ["the", "contract", "soon."]}
                        ]
                    },
                    {
                        "condition_label": "+extract_NP",
                        "sentence_text": "The singer who the producer's belief about the acoustic melody had captivated will sign the contract soon.",
                        "regions": [
                            {"index": 1, "text": "The singer who", "words": ["The", "singer", "who"]},
                            {"index": 2, "text": "the producer's", "words": ["the", "producer's"]},
                            {"index": 3, "text": "belief about", "words": ["belief", "about"]},
                            {"index": 4, "text": "the acoustic melody", "words": ["the", "acoustic", "melody"]},
                            {"index": 5, "text": "had captivated", "words": ["had", "captivated"]},
                            {"index": 6, "text": "will sign", "words": ["will", "sign"]},
                            {"index": 7, "text": "the contract soon.", "words": ["the", "contract", "soon."]}
                        ]
                    },
                    {
                        "condition_label": "-extract_VP",
                        "sentence_text": "The producer believed that the acoustic melody had captivated the singer who will sign the contract soon.",
                        "regions": [
                            {"index": 1, "text": "The producer", "words": ["The", "producer"]},
                            {"index": 2, "text": "believed that", "words": ["believed", "that"]},
                            {"index": 3, "text": "that the", "words": ["that", "the"]},
                            {"index": 4, "text": "acoustic melody", "words": ["acoustic", "melody"]},
                            {"index": 5, "text": "had captivated", "words": ["had", "captivated"]},
                            {"index": 6, "text": "the singer who", "words": ["the", "singer", "who"]},
                            {"index": 7, "text": "will sign the contract soon.", "words": ["will", "sign", "the", "contract", "soon."]}
                        ]
                    },
                    {
                        "condition_label": "-extract_NP",
                        "sentence_text": "The producer's belief about the acoustic melody had captivated the singer who will sign the contract soon.",
                        "regions": [
                            {"index": 1, "text": "The producer's", "words": ["The", "producer's"]},
                            {"index": 2, "text": "belief about", "words": ["belief", "about"]},
                            {"index": 3, "text": "about the", "words": ["about", "the"]},
                            {"index": 4, "text": "acoustic melody", "words": ["acoustic", "melody"]},
                            {"index": 5, "text": "had captivated", "words": ["had", "captivated"]},
                            {"index": 6, "text": "the singer who", "words": ["the", "singer", "who"]},
                            {"index": 7, "text": "will sign the contract soon.", "words": ["will", "sign", "the", "contract", "soon."]}
                        ]
                    }
                ]
            },
            # Filler 1
            {
                "item_number": 901,
                "type": "filler",
                "question": "Did the chef prepare dinner for eighty guests?",
                "correct_answer": "yes",
                "explanation": "The text states the chef prepared dinner for eighty guests.",
                "versions": [
                    {
                        "condition_label": "filler",
                        "sentence_text": "The head chef prepared a lavish dinner for eighty guests at the grand hotel ballroom.",
                        "regions": [
                            {"index": 1, "text": "The head chef", "words": ["The", "head", "chef"]},
                            {"index": 2, "text": "prepared a lavish", "words": ["prepared", "a", "lavish"]},
                            {"index": 3, "text": "dinner for eighty guests", "words": ["dinner", "for", "eighty", "guests"]},
                            {"index": 4, "text": "at the grand hotel ballroom.", "words": ["at", "the", "grand", "hotel", "ballroom."]}
                        ]
                    }
                ]
            },
            # Filler 2
            {
                "item_number": 902,
                "type": "filler",
                "question": "Was the train delayed because of heavy snow?",
                "correct_answer": "no",
                "explanation": "The delay was due to signal failure, not snow.",
                "versions": [
                    {
                        "condition_label": "filler",
                        "sentence_text": "The morning commuter express was delayed due to unexpected electrical signal failure.",
                        "regions": [
                            {"index": 1, "text": "The morning commuter express", "words": ["The", "morning", "commuter", "express"]},
                            {"index": 2, "text": "was delayed due to", "words": ["was", "delayed", "due", "to"]},
                            {"index": 3, "text": "unexpected electrical", "words": ["unexpected", "electrical"]},
                            {"index": 4, "text": "signal failure.", "words": ["signal", "failure."]}
                        ]
                    }
                ]
            },
            # Practice Item
            {
                "item_number": 801,
                "type": "practice",
                "question": "Did Alice visit the library yesterday afternoon?",
                "correct_answer": "yes",
                "explanation": "Alice visited the library to borrow books.",
                "versions": [
                    {
                        "condition_label": "practice",
                        "sentence_text": "Alice walked across campus to borrow three books from the university library.",
                        "regions": [
                            {"index": 1, "text": "Alice walked across campus", "words": ["Alice", "walked", "across", "campus"]},
                            {"index": 2, "text": "to borrow three books", "words": ["to", "borrow", "three", "books"]},
                            {"index": 3, "text": "from the university library.", "words": ["from", "the", "university", "library."]}
                        ]
                    }
                ]
            }
        ]

        # Insert Items & Versions
        saved_items_exp1 = []
        for it in exp1_raw_items:
            i_id = f"item_e1_{it['item_number']}"
            cursor.execute("""
            INSERT INTO items (id, experiment_id, item_number, type, question, correct_answer, explanation)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (i_id, exp1_id, it["item_number"], it["type"], it.get("question"), it.get("correct_answer"), it.get("explanation")))
            
            saved_versions = []
            for v in it["versions"]:
                v_id = f"ver_{i_id}_{v['condition_label']}"
                words = v["sentence_text"].split()
                graphemes = len(v["sentence_text"].replace(" ", ""))
                cursor.execute("""
                INSERT INTO item_versions (id, item_id, condition_label, sentence_text, regions_json, word_count, grapheme_count)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (v_id, i_id, v["condition_label"], v["sentence_text"], json.dumps(v["regions"]), len(words), graphemes))
                saved_versions.append({
                    "id": v_id,
                    "condition_label": v["condition_label"],
                    "sentence_text": v["sentence_text"],
                    "regions": v["regions"]
                })
            saved_items_exp1.append({
                "id": i_id,
                "item_number": it["item_number"],
                "type": it["type"],
                "question": it.get("question"),
                "correct_answer": it.get("correct_answer"),
                "explanation": it.get("explanation"),
                "versions": saved_versions
            })

        # Generate Latin Square Lists for Exp 1
        cond_labels_exp1 = ["+extract_VP", "+extract_NP", "-extract_VP", "-extract_NP"]
        ls_lists_exp1 = generate_latin_square_lists(saved_items_exp1, cond_labels_exp1)
        
        for list_num, list_items in ls_lists_exp1.items():
            l_id = f"list_e1_{list_num}"
            cursor.execute("INSERT INTO lists (id, experiment_id, list_number) VALUES (?, ?, ?)", (l_id, exp1_id, list_num))
            for order_idx, li in enumerate(list_items):
                cursor.execute("""
                INSERT INTO list_items (id, list_id, item_version_id, order_hint)
                VALUES (?, ?, ?, ?)
                """, (str(uuid.uuid4()), l_id, li["item_version_id"], order_idx + 1))

        # -------------------------------------------------------------
        # EXPERIMENT 2: Hindi Relative-Correlative Clause Extraposition
        # -------------------------------------------------------------
        exp2_id = "exp_hindi_sov_rel_2026"
        exp2_factors = [
            {"name": "clause_type", "levels": ["correlative", "extraposed"]},
            {"name": "embedding", "levels": ["nested", "canonical"]}
        ]
        exp2_instructions = {
            "title": "आत्म-गति पठन प्रयोग (Hindi Self-Paced Reading)",
            "body": "इस प्रयोग में आप वाक्यों को एक-एक शब्द/खंड करके पढ़ेंगे। अगला शब्द देखने के लिए SPACEBAR दबाएं। हर वाक्य के बाद पूछे गए प्रश्न का उत्तर 'F' (हाँ) या 'J' (नहीं) कुंजी दबाकर दें।"
        }

        cursor.execute("""
        INSERT INTO experiments (id, host_id, title, description, language, status, template_type, version, design_json, instructions_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            exp2_id, host_id,
            "Hindi Relative-Correlative Study (संबंधवाचक-सहसंबंधी)",
            "Hindi SOV psycholinguistic paradigm investigating filler-gap locality and case marker integration in relative-correlative structures.",
            "hi", "live", "hindi_correlative_2x2", 1,
            json.dumps(exp2_factors),
            json.dumps(exp2_instructions)
        ))

        for f in exp2_factors:
            cursor.execute("INSERT INTO factors (id, experiment_id, name, levels_json) VALUES (?, ?, ?, ?)",
                           (str(uuid.uuid4()), exp2_id, f["name"], json.dumps(f["levels"])))

        exp2_raw_items = [
            {
                "item_number": 1,
                "type": "experimental",
                "question": "क्या पत्रकार ने सुबह नया लेख लिखा था?",
                "correct_answer": "yes",
                "explanation": "वाक्य के अनुसार पत्रकार ने आज सुबह नया लेख लिखा।",
                "versions": [
                    {
                        "condition_label": "correlative_nested",
                        "sentence_text": "जिस पत्रकार ने मंत्री जी के उस विवादित बयान को सुना था उसने आज सुबह नया लेख लिखा।",
                        "regions": [
                            {"index": 1, "text": "जिस पत्रकार ने", "words": ["जिस", "पत्रकार", "ने"]},
                            {"index": 2, "text": "मंत्री जी के", "words": ["मंत्री", "जी", "के"]},
                            {"index": 3, "text": "उस विवादित बयान को", "words": ["उस", "विवादित", "बयान", "को"]},
                            {"index": 4, "text": "सुना था", "words": ["सुना", "था"]},
                            {"index": 5, "text": "उसने आज", "words": ["उसने", "आज"]},
                            {"index": 6, "text": "सुबह नया", "words": ["सुबह", "नया"]},
                            {"index": 7, "text": "लेख लिखा।", "words": ["लेख", "लिखा।"]}
                        ]
                    },
                    {
                        "condition_label": "correlative_canonical",
                        "sentence_text": "उस पत्रकार ने जिसने मंत्री जी के विवादित बयान को सुना था आज सुबह नया लेख लिखा।",
                        "regions": [
                            {"index": 1, "text": "उस पत्रकार ने", "words": ["उस", "पत्रकार", "ने"]},
                            {"index": 2, "text": "जिसने मंत्री जी के", "words": ["जिसने", "मंत्री", "जी", "के"]},
                            {"index": 3, "text": "विवादित बयान को", "words": ["विवादित", "बयान", "को"]},
                            {"index": 4, "text": "सुना था", "words": ["सुना", "था"]},
                            {"index": 5, "text": "आज सुबह", "words": ["आज", "सुबह"]},
                            {"index": 6, "text": "नया लेख", "words": ["नया", "लेख"]},
                            {"index": 7, "text": "प्रकाशित किया।", "words": ["प्रकाशित", "किया।"]}
                        ]
                    },
                    {
                        "condition_label": "extraposed_nested",
                        "sentence_text": "उस मंत्री ने जिसके उस बयान पर बड़ा विवाद हुआ था आज संसद में सफाई पेश की।",
                        "regions": [
                            {"index": 1, "text": "उस मंत्री ने", "words": ["उस", "मंत्री", "ने"]},
                            {"index": 2, "text": "जिसके उस बयान पर", "words": ["जिसके", "उस", "बयान", "पर"]},
                            {"index": 3, "text": "बड़ा विवाद हुआ था", "words": ["बड़ा", "विवाद", "हुआ", "था"]},
                            {"index": 4, "text": "आज संसद में", "words": ["आज", "संसद", "में"]},
                            {"index": 5, "text": "सफाई पेश की।", "words": ["सफाई", "पेश", "की।"]},
                            {"index": 6, "text": "पूरी गंभीरता से", "words": ["पूरी", "गंभीरता", "से"]},
                            {"index": 7, "text": "भाषण दिया।", "words": ["भाषण", "दिया।"]}
                        ]
                    },
                    {
                        "condition_label": "extraposed_canonical",
                        "sentence_text": "उस मंत्री ने आज संसद में सफाई पेश की जिस पर जनता में भारी असंतोष था।",
                        "regions": [
                            {"index": 1, "text": "उस मंत्री ने", "words": ["उस", "मंत्री", "ने"]},
                            {"index": 2, "text": "आज संसद में", "words": ["आज", "संसद", "में"]},
                            {"index": 3, "text": "सफाई पेश की", "words": ["सफाई", "पेश", "की"]},
                            {"index": 4, "text": "जिस पर जनता में", "words": ["जिस", "पर", "जनता", "में"]},
                            {"index": 5, "text": "भारी असंतोष था।", "words": ["भारी", "असंतोष", "था।"]},
                            {"index": 6, "text": "सभी दलों ने", "words": ["सभी", "दलों", "ने"]},
                            {"index": 7, "text": "सवाल पूछे।", "words": ["सवाल", "पूछे।"]}
                        ]
                    }
                ]
            },
            {
                "item_number": 2,
                "type": "experimental",
                "question": "क्या वैज्ञानिक को अंतरराष्ट्रीय पुरस्कार मिला था?",
                "correct_answer": "yes",
                "explanation": "वाक्य में स्पष्ट है कि वैज्ञानिक को खोज के लिए पुरस्कार मिला।",
                "versions": [
                    {
                        "condition_label": "correlative_nested",
                        "sentence_text": "जिस वैज्ञानिक ने प्रयोगशाला में सौर ऊर्जा की नई तकनीक खोजी थी उसे सरकार ने सम्मानित किया।",
                        "regions": [
                            {"index": 1, "text": "जिस वैज्ञानिक ने", "words": ["जिस", "वैज्ञानिक", "ने"]},
                            {"index": 2, "text": "प्रयोगशाला में", "words": ["प्रयोगशाला", "में"]},
                            {"index": 3, "text": "सौर ऊर्जा की नई तकनीक", "words": ["सौर", "ऊर्जा", "की", "नई", "तकनीक"]},
                            {"index": 4, "text": "खोजी थी", "words": ["खोजी", "थी"]},
                            {"index": 5, "text": "उसे सरकार ने", "words": ["उसे", "सरकार", "ने"]},
                            {"index": 6, "text": "भव्य समारोह में", "words": ["भव्य", "समारोह", "में"]},
                            {"index": 7, "text": "सम्मानित किया।", "words": ["सम्मानित", "किया।"]}
                        ]
                    },
                    {
                        "condition_label": "correlative_canonical",
                        "sentence_text": "उस वैज्ञानिक ने जिसने सौर ऊर्जा की नई तकनीक खोजी थी आज दिल्ली में पुरस्कार ग्रहण किया।",
                        "regions": [
                            {"index": 1, "text": "उस वैज्ञानिक ने", "words": ["उस", "वैज्ञानिक", "ने"]},
                            {"index": 2, "text": "जिसने सौर ऊर्जा की", "words": ["जिसने", "सौर", "ऊर्जा", "की"]},
                            {"index": 3, "text": "नई तकनीक खोजी थी", "words": ["नई", "तकनीक", "खोजी", "थी"]},
                            {"index": 4, "text": "आज दिल्ली में", "words": ["आज", "दिल्ली", "में"]},
                            {"index": 5, "text": "पुरस्कार ग्रहण किया।", "words": ["पुरस्कार", "ग्रहण", "किया।"]},
                            {"index": 6, "text": "सभी साथियों ने", "words": ["सभी", "साथियों", "ने"]},
                            {"index": 7, "text": "बधाई दी।", "words": ["बधाई", "दी।"]}
                        ]
                    },
                    {
                        "condition_label": "extraposed_nested",
                        "sentence_text": "उस वैज्ञानिक को जिसने सौर ऊर्जा प्रणाली तैयार की थी आज राष्ट्रीय विज्ञान भवन में सम्मानित किया गया।",
                        "regions": [
                            {"index": 1, "text": "उस वैज्ञानिक को", "words": ["उस", "वैज्ञानिक", "को"]},
                            {"index": 2, "text": "जिसने सौर ऊर्जा प्रणाली", "words": ["जिसने", "सौर", "ऊर्जा", "प्रणाली"]},
                            {"index": 3, "text": "तैयार की थी", "words": ["तैयार", "की", "थी"]},
                            {"index": 4, "text": "आज राष्ट्रीय विज्ञान भवन में", "words": ["आज", "राष्ट्रीय", "विज्ञान", "भवन", "में"]},
                            {"index": 5, "text": "सम्मानित किया गया।", "words": ["सम्मानित", "किया", "गया।"]},
                            {"index": 6, "text": "राष्ट्रपति महोदय ने", "words": ["राष्ट्रपति", "महोदय", "ने"]},
                            {"index": 7, "text": "प्रशंसा पत्र दिया।", "words": ["प्रशंसा", "पत्र", "दिया।"]}
                        ]
                    },
                    {
                        "condition_label": "extraposed_canonical",
                        "sentence_text": "उस वैज्ञानिक को आज राष्ट्रीय विज्ञान भवन में सम्मानित किया गया जिसने सौर ऊर्जा प्रणाली बनाई थी।",
                        "regions": [
                            {"index": 1, "text": "उस वैज्ञानिक को", "words": ["उस", "वैज्ञानिक", "को"]},
                            {"index": 2, "text": "आज राष्ट्रीय विज्ञान भवन में", "words": ["आज", "राष्ट्रीय", "विज्ञान", "भवन", "में"]},
                            {"index": 3, "text": "सम्मानित किया गया", "words": ["सम्मानित", "किया", "गया"]},
                            {"index": 4, "text": "जिसने सौर ऊर्जा", "words": ["जिसने", "सौर", "ऊर्जा"]},
                            {"index": 5, "text": "प्रणाली बनाई थी।", "words": ["प्रणाली", "बनाई", "थी।"]},
                            {"index": 6, "text": "राष्ट्रपति महोदय ने", "words": ["राष्ट्रपति", "महोदय", "ने"]},
                            {"index": 7, "text": "प्रशंसा की।", "words": ["प्रशंसा", "की।"]}
                        ]
                    }
                ]
            },
            # Hindi Filler 1
            {
                "item_number": 901,
                "type": "filler",
                "question": "क्या किसानों ने मंडी में गेहूँ बेचा?",
                "correct_answer": "yes",
                "explanation": "किसानों ने अच्छी कीमत पर मंडी में गेहूँ बेचा था।",
                "versions": [
                    {
                        "condition_label": "filler",
                        "sentence_text": "गाँव के किसानों ने इस वर्ष मंडी में बहुत अच्छी कीमत पर अपनी फसल बेची।",
                        "regions": [
                            {"index": 1, "text": "गाँव के किसानों ने", "words": ["गाँव", "के", "किसानों", "ने"]},
                            {"index": 2, "text": "इस वर्ष मंडी में", "words": ["इस", "वर्ष", "मंडी", "में"]},
                            {"index": 3, "text": "बहुत अच्छी कीमत पर", "words": ["बहुत", "अच्छी", "कीमत", "पर"]},
                            {"index": 4, "text": "अपनी फसल बेची।", "words": ["अपनी", "फसल", "बेची।"]}
                        ]
                    }
                ]
            },
            # Hindi Filler 2
            {
                "item_number": 902,
                "type": "filler",
                "question": "क्या आज भारी बारिश के कारण मैच रद्द हुआ?",
                "correct_answer": "no",
                "explanation": "धूप खिली थी और मैच पूरा खेला गया।",
                "versions": [
                    {
                        "condition_label": "filler",
                        "sentence_text": "स्टेडियम में दर्शकों की भारी भीड़ के बीच फाइनल मैच का आयोजन सफलतापूर्वक हुआ।",
                        "regions": [
                            {"index": 1, "text": "स्टेडियम में", "words": ["स्टेडियम", "में"]},
                            {"index": 2, "text": "दर्शकों की भारी भीड़ के बीच", "words": ["दर्शकों", "की", "भारी", "भीड़", "के", "बीच"]},
                            {"index": 3, "text": "फाइनल मैच का आयोजन", "words": ["फाइनल", "मैच", "का", "आयोजन"]},
                            {"index": 4, "text": "सफलतापूर्वक हुआ।", "words": ["सफलतापूर्वक", "हुआ।"]}
                        ]
                    }
                ]
            },
            # Hindi Practice Trial
            {
                "item_number": 801,
                "type": "practice",
                "question": "क्या रोहन ने बाज़ार से ताज़े फल खरीदे?",
                "correct_answer": "yes",
                "explanation": "रोहन ने बाज़ार जाकर फल खरीदे थे।",
                "versions": [
                    {
                        "condition_label": "practice",
                        "sentence_text": "रोहन ने सुबह बाज़ार जाकर मीठे और ताज़े फल खरीदे।",
                        "regions": [
                            {"index": 1, "text": "रोहन ने सुबह", "words": ["रोहन", "ने", "सुबह"]},
                            {"index": 2, "text": "बाज़ार जाकर", "words": ["बाज़ार", "जाकर"]},
                            {"index": 3, "text": "मीठे और ताज़े", "words": ["मीठे", "और", "ताज़े"]},
                            {"index": 4, "text": "फल खरीदे।", "words": ["फल", "खरीदे।"]}
                        ]
                    }
                ]
            }
        ]

        saved_items_exp2 = []
        for it in exp2_raw_items:
            i_id = f"item_e2_{it['item_number']}"
            cursor.execute("""
            INSERT INTO items (id, experiment_id, item_number, type, question, correct_answer, explanation)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (i_id, exp2_id, it["item_number"], it["type"], it.get("question"), it.get("correct_answer"), it.get("explanation")))
            
            saved_versions = []
            for v in it["versions"]:
                v_id = f"ver_{i_id}_{v['condition_label']}"
                words = v["sentence_text"].split()
                graphemes = len(v["sentence_text"].replace(" ", ""))
                cursor.execute("""
                INSERT INTO item_versions (id, item_id, condition_label, sentence_text, regions_json, word_count, grapheme_count)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (v_id, i_id, v["condition_label"], v["sentence_text"], json.dumps(v["regions"]), len(words), graphemes))
                saved_versions.append({
                    "id": v_id,
                    "condition_label": v["condition_label"],
                    "sentence_text": v["sentence_text"],
                    "regions": v["regions"]
                })
            saved_items_exp2.append({
                "id": i_id,
                "item_number": it["item_number"],
                "type": it["type"],
                "question": it.get("question"),
                "correct_answer": it.get("correct_answer"),
                "explanation": it.get("explanation"),
                "versions": saved_versions
            })

        cond_labels_exp2 = ["correlative_nested", "correlative_canonical", "extraposed_nested", "extraposed_canonical"]
        ls_lists_exp2 = generate_latin_square_lists(saved_items_exp2, cond_labels_exp2)
        
        for list_num, list_items in ls_lists_exp2.items():
            l_id = f"list_e2_{list_num}"
            cursor.execute("INSERT INTO lists (id, experiment_id, list_number) VALUES (?, ?, ?)", (l_id, exp2_id, list_num))
            for order_idx, li in enumerate(list_items):
                cursor.execute("""
                INSERT INTO list_items (id, list_id, item_version_id, order_hint)
                VALUES (?, ?, ?, ?)
                """, (str(uuid.uuid4()), l_id, li["item_version_id"], order_idx + 1))

        # -------------------------------------------------------------
        # SYNTHETIC PILOT DATA: 12 Participants for Exp 1
        # Replicating Gibson & Warren (2004) Residual RT pattern
        # Critical Region 5: +extract VP ~ 63ms residual, +extract NP ~ 138ms residual, -extract VP ~ 8ms, -extract NP ~ 22ms
        # -------------------------------------------------------------
        print("Seeding synthetic pilot participants and reading times...")
        
        for p_idx in range(12):
            pid = f"part_pilot_{p_idx + 1:03d}"
            list_num = (p_idx % 4) + 1
            list_id = f"list_e1_{list_num}"
            
            cursor.execute("""
            INSERT INTO participants (id, experiment_id, list_id, external_id, consent_at, user_agent, screen_w, screen_h, refresh_rate_est, jitter_ms, background_json, status, completed_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 1920, 1080, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
            """, (
                pid, exp1_id, list_id, f"PROLIFIC_P{p_idx+100}",
                "Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0.0.0 Safari/537.36",
                random.choice([60.0, 120.0, 144.0]),
                round(random.uniform(1.8, 3.4), 2),
                json.dumps({"age": random.randint(20, 34), "native_language": "English", "reading_glasses": "no"})
            ))

            # Retrieve items assigned to this list
            cursor.execute("""
            SELECT li.item_version_id, iv.condition_label, iv.regions_json, i.item_number, i.type as item_type, i.correct_answer
            FROM list_items li
            JOIN item_versions iv ON li.item_version_id = iv.id
            JOIN items i ON iv.item_id = i.id
            WHERE li.list_id = ?
            ORDER BY li.order_hint
            """, (list_id,))
            assigned_trials = cursor.fetchall()

            for t_idx, trial_row in enumerate(assigned_trials):
                trial_id = f"trial_{pid}_{t_idx+1}"
                is_correct = 1 if random.random() < 0.92 else 0
                q_rt = random.uniform(1100, 2200)

                cursor.execute("""
                INSERT INTO trials (id, participant_id, item_version_id, presentation_order, started_at, completed_at, question_response, correct, question_rt_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (trial_id, pid, trial_row["item_version_id"], t_idx + 1, 1000.0, 5000.0, trial_row["correct_answer"] if is_correct else "no", is_correct, q_rt))

                regions = json.loads(trial_row["regions_json"])
                word_global_idx = 0
                
                # Base participant speed (slope & intercept for RT ~ length)
                base_intercept = random.uniform(280, 360)
                length_slope = random.uniform(18, 26)

                for r in regions:
                    r_idx = r["index"]
                    words = r["words"]

                    # Base effect for critical region (region 5)
                    cond = trial_row["condition_label"]
                    condition_boost = 0.0
                    if r_idx == 5: # CRITICAL REGION (had pleased)
                        if cond == "+extract_VP":
                            condition_boost = random.uniform(50, 75)   # Paper: 63.6 ms
                        elif cond == "+extract_NP":
                            condition_boost = random.uniform(120, 160) # Paper: 138.5 ms (SIGNIFICANT INTERACTION)
                        elif cond == "-extract_VP":
                            condition_boost = random.uniform(-5, 18)   # Paper: 7.7 ms
                        elif cond == "-extract_NP":
                            condition_boost = random.uniform(10, 35)   # Paper: 22.3 ms
                    elif r_idx == 6: # SPILLOVER REGION
                        if "+extract" in cond:
                            condition_boost = random.uniform(30, 60)

                    for w in words:
                        graphemes = len(w)
                        noise = random.gauss(0, 35)
                        simulated_rt = max(180, base_intercept + length_slope * graphemes + condition_boost + noise)

                        cursor.execute("""
                        INSERT INTO word_events (id, trial_id, word_index, region_index, word_text, rt_ms, t_shown, t_pressed, grapheme_count, is_repeat, is_outlier)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
                        """, (
                            str(uuid.uuid4()), trial_id, word_global_idx, r_idx, w,
                            round(simulated_rt, 1), 1000.0 + word_global_idx * 400, 1000.0 + word_global_idx * 400 + simulated_rt,
                            graphemes
                        ))
                        word_global_idx += 1

        print("Database initialized and seeded successfully!")

if __name__ == "__main__":
    from app.database import init_db
    init_db()
    seed_database()
