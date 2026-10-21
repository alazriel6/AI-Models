package database

import (
	"encoding/json"
	"log"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

type SeedPoseItem struct {
	Title             string      `json:"title"`
	Category          string      `json:"category"`
	Tags              string      `json:"tags"`
	Description       string      `json:"description"`
	RecommendedPrompt string      `json:"recommended_prompt"`
	CanvasWidth       int         `json:"canvas_width"`
	CanvasHeight      int         `json:"canvas_height"`
	Keypoints         [][]float64 `json:"keypoints"` // 18 points: [x, y, confidence]
}

func SeedControlNetPoses(db *gorm.DB) error {
	var count int64
	db.Model(&models.ControlNetPose{}).Count(&count)
	if count > 0 {
		return nil
	}

	log.Println("Seeding ControlNet OpenPose presets...")

	seedPoses := []SeedPoseItem{
		// 1. Classic Standing Runway Model
		{
			Title:             "Classic Model Standing Walk",
			Category:          "Standing & Model",
			Tags:              "fashion, standing, full body, runway, confident",
			Description:       "Pose berdiri elegan dengan satu kaki sedikit maju dan tangan santai di samping pinggul. Sangat ideal untuk showcase busana karakter anime maupun fotorealistik.",
			RecommendedPrompt: "1girl, solo, fashion model, high fashion runway dress, confident expression, full body shot, detailed fabric texture, soft studio lighting",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{256, 110, 1.0}, // 0: Nose
				{256, 160, 1.0}, // 1: Neck
				{215, 165, 1.0}, // 2: R-Shoulder
				{195, 260, 1.0}, // 3: R-Elbow
				{185, 360, 1.0}, // 4: R-Wrist
				{297, 165, 1.0}, // 5: L-Shoulder
				{315, 260, 1.0}, // 6: L-Elbow
				{320, 355, 1.0}, // 7: L-Wrist
				{230, 360, 1.0}, // 8: R-Hip
				{225, 510, 1.0}, // 9: R-Knee
				{220, 680, 1.0}, // 10: R-Ankle
				{282, 360, 1.0}, // 11: L-Hip
				{295, 515, 1.0}, // 12: L-Knee
				{305, 685, 1.0}, // 13: L-Ankle
				{248, 100, 1.0}, // 14: R-Eye
				{264, 100, 1.0}, // 15: L-Eye
				{235, 108, 1.0}, // 16: R-Ear
				{277, 108, 1.0}, // 17: L-Ear
			},
		},
		// 2. Hands on Hips Confident Heroine
		{
			Title:             "Confident Hands on Hips",
			Category:          "Standing & Model",
			Tags:              "confident, heroic, hands on hips, standing, attitude",
			Description:       "Pose percaya diri dengan kedua tangan bertolak pinggang. Cocok untuk karakter tsundere, pemimpin skuad, atau hero pose.",
			RecommendedPrompt: "1girl, solo, standing, hands on hips, smug grin, looking at viewer, school uniform, wind blowing hair, anime aesthetic",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{256, 120, 1.0}, // 0: Nose
				{256, 165, 1.0}, // 1: Neck
				{210, 175, 1.0}, // 2: R-Shoulder
				{160, 260, 1.0}, // 3: R-Elbow
				{215, 345, 1.0}, // 4: R-Wrist
				{302, 175, 1.0}, // 5: L-Shoulder
				{352, 260, 1.0}, // 6: L-Elbow
				{297, 345, 1.0}, // 7: L-Wrist
				{225, 355, 1.0}, // 8: R-Hip
				{215, 510, 1.0}, // 9: R-Knee
				{205, 680, 1.0}, // 10: R-Ankle
				{287, 355, 1.0}, // 11: L-Hip
				{297, 510, 1.0}, // 12: L-Knee
				{307, 680, 1.0}, // 13: L-Ankle
				{247, 110, 1.0}, // 14: R-Eye
				{265, 110, 1.0}, // 15: L-Eye
				{235, 118, 1.0}, // 16: R-Ear
				{277, 118, 1.0}, // 17: L-Ear
			},
		},
		// 3. Dynamic Flying High Kick (Action)
		{
			Title:             "Dynamic Anime High Kick",
			Category:          "Action & Combat",
			Tags:              "martial arts, action, high kick, combat, dynamic angle",
			Description:       "Pose tendangan tinggi akrobatik dengan sudut dinamis. Bagus untuk pertarungan seni bela diri, cyberpunk fighting, atau magical girl.",
			RecommendedPrompt: "1girl, solo, high kick, action pose, dynamic angle, motion blur, martial artist, torn battle attire, particle sparks, intense eyes",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{310, 230, 1.0}, // 0: Nose
				{290, 270, 1.0}, // 1: Neck
				{250, 280, 1.0}, // 2: R-Shoulder
				{205, 340, 1.0}, // 3: R-Elbow
				{160, 395, 1.0}, // 4: R-Wrist
				{330, 260, 1.0}, // 5: L-Shoulder
				{375, 310, 1.0}, // 6: L-Elbow
				{390, 370, 1.0}, // 7: L-Wrist
				{250, 420, 1.0}, // 8: R-Hip
				{230, 540, 1.0}, // 9: R-Knee
				{215, 680, 1.0}, // 10: R-Ankle
				{270, 380, 1.0}, // 11: L-Hip
				{210, 240, 1.0}, // 12: L-Knee
				{130, 120, 1.0}, // 13: L-Ankle (Kaki menendang tinggi ke atas)
				{318, 220, 1.0}, // 14: R-Eye
				{326, 228, 1.0}, // 15: L-Eye
				{290, 225, 1.0}, // 16: R-Ear
				{325, 245, 1.0}, // 17: L-Ear
			},
		},
		// 4. Dual Katana Combat Stance
		{
			Title:             "Dual Sword Ready Stance",
			Category:          "Action & Combat",
			Tags:              "katana, sword, samurai, fighting stance, ready pose",
			Description:       "Pose kuda-kuda rendah dengan pedang ganda siap menyerang. Menampilkan tegangan tubuh dan kesiapan bertarung.",
			RecommendedPrompt: "1girl, solo, dual wielding katana, samurai warrior, low fighting stance, glowing blade edge, cherry blossom petals, dramatic night lighting",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{240, 170, 1.0}, // 0: Nose
				{248, 220, 1.0}, // 1: Neck
				{200, 230, 1.0}, // 2: R-Shoulder
				{145, 290, 1.0}, // 3: R-Elbow
				{180, 210, 1.0}, // 4: R-Wrist (Tangan kanan pegang pedang atas)
				{295, 220, 1.0}, // 5: L-Shoulder
				{350, 280, 1.0}, // 6: L-Elbow
				{315, 340, 1.0}, // 7: L-Wrist (Tangan kiri arah bawah)
				{215, 380, 1.0}, // 8: R-Hip
				{160, 480, 1.0}, // 9: R-Knee (Kaki kanan ditekuk maju)
				{130, 620, 1.0}, // 10: R-Ankle
				{285, 390, 1.0}, // 11: L-Hip
				{350, 490, 1.0}, // 12: L-Knee (Kaki kiri lurus mundur)
				{410, 640, 1.0}, // 13: L-Ankle
				{232, 162, 1.0}, // 14: R-Eye
				{248, 162, 1.0}, // 15: L-Eye
				{218, 172, 1.0}, // 16: R-Ear
				{262, 172, 1.0}, // 17: L-Ear
			},
		},
		// 5. Superhero Ground Slam / 3-Point Landing
		{
			Title:             "Superhero 3-Point Ground Landing",
			Category:          "Action & Combat",
			Tags:              "superhero, landing, ground slam, dynamic, impact",
			Description:       "Pose pendaratan dramatis satu tangan menghantam lantai, satu lutut bertumpu di tanah. Efek retakan tanah dan kepulan debu sangat dramatis.",
			RecommendedPrompt: "1girl, solo, 3-point superhero landing, fist to ground, crater impact, dust explosion, cyberpunk armor, glowing accents, cinematic shot",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{260, 310, 1.0}, // 0: Nose
				{265, 370, 1.0}, // 1: Neck
				{205, 390, 1.0}, // 2: R-Shoulder
				{160, 460, 1.0}, // 3: R-Elbow
				{180, 560, 1.0}, // 4: R-Wrist (Tangan kanan di tanah)
				{325, 375, 1.0}, // 5: L-Shoulder
				{380, 380, 1.0}, // 6: L-Elbow
				{430, 430, 1.0}, // 7: L-Wrist (Tangan kiri terangkat ke belakang)
				{240, 500, 1.0}, // 8: R-Hip
				{180, 580, 1.0}, // 9: R-Knee
				{210, 670, 1.0}, // 10: R-Ankle
				{310, 490, 1.0}, // 11: L-Hip
				{370, 570, 1.0}, // 12: L-Knee
				{430, 680, 1.0}, // 13: L-Ankle
				{250, 300, 1.0}, // 14: R-Eye
				{268, 300, 1.0}, // 15: L-Eye
				{238, 312, 1.0}, // 16: R-Ear
				{282, 312, 1.0}, // 17: L-Ear
			},
		},
		// 6. Sitting on Chair Crossed Legs
		{
			Title:             "Elegantly Seated Crossed Legs",
			Category:          "Sitting & Relaxed",
			Tags:              "sitting, chair, crossed legs, elegant, indoor",
			Description:       "Pose duduk di kursi dengan kaki menyilang elegan dan tangan santai di paha. Cocok untuk adegan kafe, kantor, atau pesta mewah.",
			RecommendedPrompt: "1girl, solo, sitting on vintage velvet chair, legs crossed at knee, hand on lap, sophisticated dress, coffee cup on side table, warm cafe interior",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{256, 150, 1.0}, // 0: Nose
				{256, 200, 1.0}, // 1: Neck
				{205, 210, 1.0}, // 2: R-Shoulder
				{175, 305, 1.0}, // 3: R-Elbow
				{220, 385, 1.0}, // 4: R-Wrist
				{307, 210, 1.0}, // 5: L-Shoulder
				{335, 305, 1.0}, // 6: L-Elbow
				{290, 385, 1.0}, // 7: L-Wrist
				{220, 400, 1.0}, // 8: R-Hip
				{230, 530, 1.0}, // 9: R-Knee
				{265, 680, 1.0}, // 10: R-Ankle
				{292, 400, 1.0}, // 11: L-Hip
				{250, 510, 1.0}, // 12: L-Knee (Menyilang di atas lutut kanan)
				{285, 660, 1.0}, // 13: L-Ankle
				{247, 140, 1.0}, // 14: R-Eye
				{265, 140, 1.0}, // 15: L-Eye
				{235, 148, 1.0}, // 16: R-Ear
				{277, 148, 1.0}, // 17: L-Ear
			},
		},
		// 7. Floor Seated Meditation / Lotus
		{
			Title:             "Floor Seated Lotus Pose",
			Category:          "Sitting & Relaxed",
			Tags:              "sitting, floor, lotus, meditation, calm, shrine",
			Description:       "Pose duduk bersila di lantai atau tatami dengan postur tegak menenangkan. Bagus untuk tema miko, biksu, yoga, atau santai di kamar.",
			RecommendedPrompt: "1girl, solo, lotus position, sitting on tatami floor, shrine maiden miko, peaceful expression, incense smoke, traditional japanese room",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{256, 180, 1.0}, // 0: Nose
				{256, 235, 1.0}, // 1: Neck
				{200, 245, 1.0}, // 2: R-Shoulder
				{170, 350, 1.0}, // 3: R-Elbow
				{205, 450, 1.0}, // 4: R-Wrist
				{312, 245, 1.0}, // 5: L-Shoulder
				{342, 350, 1.0}, // 6: L-Elbow
				{307, 450, 1.0}, // 7: L-Wrist
				{220, 460, 1.0}, // 8: R-Hip
				{140, 550, 1.0}, // 9: R-Knee
				{240, 600, 1.0}, // 10: R-Ankle
				{292, 460, 1.0}, // 11: L-Hip
				{372, 550, 1.0}, // 12: L-Knee
				{272, 600, 1.0}, // 13: L-Ankle
				{247, 170, 1.0}, // 14: R-Eye
				{265, 170, 1.0}, // 15: L-Eye
				{235, 178, 1.0}, // 16: R-Ear
				{277, 178, 1.0}, // 17: L-Ear
			},
		},
		// 8. Over the Shoulder Look Back
		{
			Title:             "Walking Away Looking Back",
			Category:          "Standing & Model",
			Tags:              "back view, looking back, over shoulder, mysterious, turn",
			Description:       "Pose berjalan membelakangi kamera namun menolehkan kepala ke arah penonton. Memberikan kesan misterius dan elegan.",
			RecommendedPrompt: "1girl, solo, from behind, looking back over shoulder, gentle smile, long floating hair, street lamps at dusk, bokeh background",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{215, 125, 1.0}, // 0: Nose
				{250, 160, 1.0}, // 1: Neck
				{205, 175, 1.0}, // 2: R-Shoulder
				{190, 270, 1.0}, // 3: R-Elbow
				{185, 370, 1.0}, // 4: R-Wrist
				{295, 175, 1.0}, // 5: L-Shoulder
				{315, 270, 1.0}, // 6: L-Elbow
				{320, 370, 1.0}, // 7: L-Wrist
				{225, 375, 1.0}, // 8: R-Hip
				{210, 520, 1.0}, // 9: R-Knee
				{200, 680, 1.0}, // 10: R-Ankle
				{280, 375, 1.0}, // 11: L-Hip
				{295, 515, 1.0}, // 12: L-Knee
				{310, 675, 1.0}, // 13: L-Ankle
				{210, 115, 1.0}, // 14: R-Eye
				{225, 118, 1.0}, // 15: L-Eye
				{235, 125, 1.0}, // 16: R-Ear
				{250, 130, 1.0}, // 17: L-Ear
			},
		},
		// 9. Smartphone Selfie Angle
		{
			Title:             "High-Angle Smartphone Selfie",
			Category:          "Portrait & Selfie",
			Tags:              "selfie, high angle, phone, wink, peace sign, modern",
			Description:       "Pose potret selfie dari sudut atas dengan satu tangan memegang handphone dan satu tangan membuat pose damai atau menyentuh pipi.",
			RecommendedPrompt: "1girl, solo, selfie, high angle, holding smartphone, wink, peace sign, casual hoodie, bedroom mirror, vibrant colors",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{256, 175, 1.0}, // 0: Nose
				{256, 235, 1.0}, // 1: Neck
				{195, 260, 1.0}, // 2: R-Shoulder
				{130, 210, 1.0}, // 3: R-Elbow
				{160, 110, 1.0}, // 4: R-Wrist (Tangan kanan pegang smartphone ke atas)
				{317, 260, 1.0}, // 5: L-Shoulder
				{375, 330, 1.0}, // 6: L-Elbow
				{330, 240, 1.0}, // 7: L-Wrist (Tangan kiri peace sign di samping pipi)
				{215, 480, 1.0}, // 8: R-Hip
				{210, 620, 1.0}, // 9: R-Knee
				{205, 740, 1.0}, // 10: R-Ankle
				{297, 480, 1.0}, // 11: L-Hip
				{300, 620, 1.0}, // 12: L-Knee
				{305, 740, 1.0}, // 13: L-Ankle
				{245, 165, 1.0}, // 14: R-Eye
				{267, 165, 1.0}, // 15: L-Eye
				{230, 172, 1.0}, // 16: R-Ear
				{282, 172, 1.0}, // 17: L-Ear
			},
		},
		// 10. Waist-Up Finger Gun & Wink
		{
			Title:             "Playful Finger Gun & Wink",
			Category:          "Portrait & Selfie",
			Tags:              "finger gun, playful, wink, upper body, cheerful",
			Description:       "Pose setengah badan yang ceria mengarahkan 'finger gun' ke kamera dengan mata berkedip. Sangat populer untuk karakter anime idol.",
			RecommendedPrompt: "1girl, solo, upper body, finger gun, wink, cheerful idol outfit, stage confetti, sparkling stage lights, master piece",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{256, 160, 1.0}, // 0: Nose
				{256, 215, 1.0}, // 1: Neck
				{195, 230, 1.0}, // 2: R-Shoulder
				{155, 310, 1.0}, // 3: R-Elbow
				{180, 400, 1.0}, // 4: R-Wrist
				{317, 230, 1.0}, // 5: L-Shoulder
				{370, 260, 1.0}, // 6: L-Elbow
				{350, 190, 1.0}, // 7: L-Wrist (Tangan kiri finger gun arah kamera)
				{220, 440, 1.0}, // 8: R-Hip
				{215, 590, 1.0}, // 9: R-Knee
				{210, 740, 1.0}, // 10: R-Ankle
				{292, 440, 1.0}, // 11: L-Hip
				{295, 590, 1.0}, // 12: L-Knee
				{300, 740, 1.0}, // 13: L-Ankle
				{245, 150, 1.0}, // 14: R-Eye
				{267, 150, 1.0}, // 15: L-Eye
				{230, 158, 1.0}, // 16: R-Ear
				{282, 158, 1.0}, // 17: L-Ear
			},
		},
		// 11. Dramatic Foreshortened Hand Reach
		{
			Title:             "Foreshortened Hand Reach Out",
			Category:          "Dynamic & Aerial",
			Tags:              "foreshortening, dynamic, hand reach, camera perspective, dramatic",
			Description:       "Pose perspektif dramatis dengan satu tangan mengulur ke arah kamera dengan efek 'fisheye' atau 'foreshortening'. Memberikan kesan imersif yang kuat.",
			RecommendedPrompt: "1girl, solo, reach out hand towards viewer, foreshortening, fisheye perspective, emotional expression, floating ribbons, celestial starry night sky",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{256, 190, 1.0}, // 0: Nose
				{256, 250, 1.0}, // 1: Neck
				{200, 260, 1.0}, // 2: R-Shoulder
				{150, 330, 1.0}, // 3: R-Elbow
				{130, 420, 1.0}, // 4: R-Wrist
				{312, 260, 1.0}, // 5: L-Shoulder
				{310, 360, 1.0}, // 6: L-Elbow
				{260, 430, 1.0}, // 7: L-Wrist (Tangan kiri mengulur ke depan kamera)
				{220, 470, 1.0}, // 8: R-Hip
				{200, 590, 1.0}, // 9: R-Knee
				{190, 720, 1.0}, // 10: R-Ankle
				{292, 470, 1.0}, // 11: L-Hip
				{310, 590, 1.0}, // 12: L-Knee
				{320, 720, 1.0}, // 13: L-Ankle
				{245, 180, 1.0}, // 14: R-Eye
				{267, 180, 1.0}, // 15: L-Eye
				{230, 188, 1.0}, // 16: R-Ear
				{282, 188, 1.0}, // 17: L-Ear
			},
		},
		// 12. Mid-Air Floating / Weightless Fall
		{
			Title:             "Mid-Air Floating / Weightless Drop",
			Category:          "Dynamic & Aerial",
			Tags:              "floating, zero gravity, falling, aerial, weightless, fantasy",
			Description:       "Pose melayang anggun di udara seolah berada dalam gravitasi nol atau jatuh dari langit. Sempurna untuk tema fantasi, sci-fi, atau underwater.",
			RecommendedPrompt: "1girl, solo, floating in mid-air, weightless, falling from sky, outstretched arms, dreamy expression, glowing magic circles, clouds below, majestic wind",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{256, 210, 1.0}, // 0: Nose
				{256, 270, 1.0}, // 1: Neck
				{180, 240, 1.0}, // 2: R-Shoulder
				{110, 200, 1.0}, // 3: R-Elbow
				{60, 160, 1.0},  // 4: R-Wrist (Tangan kanan terangkat ke atas kiri)
				{332, 240, 1.0}, // 5: L-Shoulder
				{400, 200, 1.0}, // 6: L-Elbow
				{450, 160, 1.0}, // 7: L-Wrist (Tangan kiri terangkat ke atas kanan)
				{225, 410, 1.0}, // 8: R-Hip
				{170, 520, 1.0}, // 9: R-Knee
				{150, 660, 1.0}, // 10: R-Ankle
				{287, 410, 1.0}, // 11: L-Hip
				{340, 510, 1.0}, // 12: L-Knee
				{380, 640, 1.0}, // 13: L-Ankle
				{247, 200, 1.0}, // 14: R-Eye
				{265, 200, 1.0}, // 15: L-Eye
				{235, 208, 1.0}, // 16: R-Ear
				{277, 208, 1.0}, // 17: L-Ear
			},
		},
		// 13. Casual Lean Against Wall
		{
			Title:             "Casual Lean Against Wall",
			Category:          "Standing & Model",
			Tags:              "leaning, wall, casual, street style, relaxed stance",
			Description:       "Pose bersandar santai pada dinding atau tiang dengan satu kaki tertekuk ke belakang. Sangat cocok untuk tema streetwear atau urban fotografi.",
			RecommendedPrompt: "1girl, solo, leaning against brick wall, one foot propped up, hands in pockets, oversized jacket, street photography, neon city lights, rainy sidewalk",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{235, 140, 1.0}, // 0: Nose
				{245, 190, 1.0}, // 1: Neck
				{200, 205, 1.0}, // 2: R-Shoulder
				{185, 290, 1.0}, // 3: R-Elbow
				{210, 360, 1.0}, // 4: R-Wrist
				{290, 200, 1.0}, // 5: L-Shoulder
				{315, 285, 1.0}, // 6: L-Elbow
				{285, 360, 1.0}, // 7: L-Wrist
				{230, 380, 1.0}, // 8: R-Hip
				{225, 520, 1.0}, // 9: R-Knee
				{220, 680, 1.0}, // 10: R-Ankle (Kaki tumpuan lurus)
				{280, 380, 1.0}, // 11: L-Hip
				{310, 480, 1.0}, // 12: L-Knee (Kaki ditekuk bersandar ke dinding)
				{275, 560, 1.0}, // 13: L-Ankle
				{228, 130, 1.0}, // 14: R-Eye
				{244, 130, 1.0}, // 15: L-Eye
				{215, 138, 1.0}, // 16: R-Ear
				{255, 138, 1.0}, // 17: L-Ear
			},
		},
		// 14. Archery Bow Draw Stance
		{
			Title:             "Archery Bow Draw & Aim",
			Category:          "Action & Combat",
			Tags:              "archery, bow and arrow, aim, focus, kyudo, fantasy",
			Description:       "Pose memanah tradisional (Kyudo / Elven Archer) dengan tangan kiri menahan busur lurus dan tangan kanan menarik tali busur di samping dagu.",
			RecommendedPrompt: "1girl, solo, elven archer, drawing greatbow, aiming at target, focused gaze, arrow ready to loose, mythical forest grove, sun rays piercing canopy",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{195, 175, 1.0}, // 0: Nose
				{230, 210, 1.0}, // 1: Neck
				{255, 220, 1.0}, // 2: R-Shoulder
				{280, 205, 1.0}, // 3: R-Elbow (Siku kanan ditarik ke belakang)
				{225, 195, 1.0}, // 4: R-Wrist (Tangan kanan tarik tali di samping pipi)
				{175, 215, 1.0}, // 5: L-Shoulder
				{110, 215, 1.0}, // 6: L-Elbow (Tangan kiri lurus menahan busur)
				{55, 215, 1.0},  // 7: L-Wrist
				{240, 380, 1.0}, // 8: R-Hip
				{280, 500, 1.0}, // 9: R-Knee
				{320, 660, 1.0}, // 10: R-Ankle
				{185, 380, 1.0}, // 11: L-Hip
				{150, 500, 1.0}, // 12: L-Knee
				{130, 660, 1.0}, // 13: L-Ankle
				{190, 165, 1.0}, // 14: R-Eye
				{200, 165, 1.0}, // 15: L-Eye
				{215, 170, 1.0}, // 16: R-Ear
				{225, 170, 1.0}, // 17: L-Ear
			},
		},
		// 15. Reclining on Floor Overhead View
		{
			Title:             "Floor Recline Overhead View",
			Category:          "Sitting & Relaxed",
			Tags:              "lying down, floor, overhead view, recline, relaxed, top down",
			Description:       "Pose berbaring santai di lantai dilihat dari sudut pandang atas (top-down / bird's-eye view). Rambut tergerai bebas di lantai.",
			RecommendedPrompt: "1girl, solo, lying on back on wooden floor, view from above, long hair spread out on ground, dreamy look, white sundress, warm afternoon window sunlight",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				{256, 180, 1.0}, // 0: Nose
				{256, 240, 1.0}, // 1: Neck
				{195, 255, 1.0}, // 2: R-Shoulder
				{150, 310, 1.0}, // 3: R-Elbow
				{140, 390, 1.0}, // 4: R-Wrist
				{317, 255, 1.0}, // 5: L-Shoulder
				{360, 310, 1.0}, // 6: L-Elbow
				{370, 390, 1.0}, // 7: L-Wrist
				{220, 420, 1.0}, // 8: R-Hip
				{190, 530, 1.0}, // 9: R-Knee
				{180, 650, 1.0}, // 10: R-Ankle
				{292, 420, 1.0}, // 11: L-Hip
				{320, 530, 1.0}, // 12: L-Knee
				{330, 650, 1.0}, // 13: L-Ankle
				{245, 170, 1.0}, // 14: R-Eye
				{267, 170, 1.0}, // 15: L-Eye
				{230, 180, 1.0}, // 16: R-Ear
				{282, 180, 1.0}, // 17: L-Ear
			},
		},
		// 16. Friendly Duo Side-by-Side
		{
			Title:             "Duo Side-by-Side Friendship",
			Category:          "Duo & Interaction",
			Tags:              "2girls, multiple girls, duo, friends, shoulder to shoulder",
			Description:       "Pose dua karakter berdiri berdampingan saling merangkul bahu. Solusi terbaik untuk mengatasi masalah model AI yang sering menggabungkan anatomi 2 orang.",
			RecommendedPrompt: "2girls, duo, friends, standing side by side, arm around shoulder, smiling warmly, matching casual outfits, outdoor park festival",
			CanvasWidth:       512,
			CanvasHeight:      768,
			Keypoints: [][]float64{
				// Karakter 1 (Kiri)
				{190, 170, 1.0}, // 0: Nose
				{190, 220, 1.0}, // 1: Neck
				{150, 230, 1.0}, // 2: R-Shoulder
				{125, 310, 1.0}, // 3: R-Elbow
				{120, 400, 1.0}, // 4: R-Wrist
				{230, 230, 1.0}, // 5: L-Shoulder
				{260, 240, 1.0}, // 6: L-Elbow (Merangkul bahu teman)
				{290, 235, 1.0}, // 7: L-Wrist
				{165, 390, 1.0}, // 8: R-Hip
				{160, 520, 1.0}, // 9: R-Knee
				{155, 660, 1.0}, // 10: R-Ankle
				{215, 390, 1.0}, // 11: L-Hip
				{210, 520, 1.0}, // 12: L-Knee
				{205, 660, 1.0}, // 13: L-Ankle
				{182, 160, 1.0}, // 14: R-Eye
				{198, 160, 1.0}, // 15: L-Eye
				{172, 168, 1.0}, // 16: R-Ear
				{208, 168, 1.0}, // 17: L-Ear
			},
		},
	}

	for _, item := range seedPoses {
		keypointsJson, err := json.Marshal(item.Keypoints)
		if err != nil {
			log.Printf("Warning: failed to marshal keypoints for %s: %v\n", item.Title, err)
			continue
		}

		pose := models.ControlNetPose{
			Title:             item.Title,
			Category:          item.Category,
			Tags:              item.Tags,
			Description:       item.Description,
			RecommendedPrompt: item.RecommendedPrompt,
			KeypointsData:     string(keypointsJson),
			CanvasWidth:       item.CanvasWidth,
			CanvasHeight:      item.CanvasHeight,
			IsSystem:          true,
		}

		if err := db.Create(&pose).Error; err != nil {
			log.Printf("Warning: failed to insert pose %s: %v\n", item.Title, err)
		}
	}

	log.Printf("Successfully seeded %d ControlNet OpenPose presets.\n", len(seedPoses))
	return nil
}
