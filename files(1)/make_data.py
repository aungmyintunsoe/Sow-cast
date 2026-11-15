import pandas as pd, math

# ---------------- REGIONS (approximate priors; see climate_values_source) ----------------
# id,country,region,place,lat,lon,rain_mm,temp_c,dry_months,soil,drainage,slope_pct,flood,salinity,irrigation,tree_dom,soil_degraded,tier
R = [
("mm-dry-zone","Myanmar","Central Dry Zone","Magway",20.15,94.93,754,27.5,6,"sandy_loam","good",2,1,1,1,0,1,"curated"),
("mm-ayeyarwady","Myanmar","Ayeyarwady Delta","Pathein",16.78,94.73,2600,27.5,4,"clay","poor",0.5,3,2,1,0,0,"auto"),
("mm-shan","Myanmar","Shan Plateau","Taunggyi",20.78,97.04,1400,20,5,"loam","good",12,0,0,1,0,0,"auto"),
("mm-kachin","Myanmar","Kachin Hills","Myitkyina",25.38,97.40,2200,24,4,"loam","moderate",10,1,0,0,0,0,"auto"),
("mm-rakhine","Myanmar","Rakhine Coast","Sittwe",20.15,92.90,4200,27,5,"clay","poor",1,3,2,0,0,0,"auto"),
("mm-tanintharyi","Myanmar","Tanintharyi","Dawei",14.08,98.20,4000,27,3,"clay_loam","moderate",5,2,1,0,1,0,"auto"),
("th-north","Thailand","North","Chiang Mai",18.79,98.98,1200,26,5,"loam","good",8,1,0,2,0,0,"auto"),
("th-isan","Thailand","Northeast (Isan)","Khon Kaen",16.43,102.83,1190,27.4,5,"sandy","good",3,1,1,1,0,1,"curated"),
("th-central","Thailand","Central Plain","Suphan Buri",14.47,100.12,1100,28,5,"clay","poor",0.5,2,0,3,0,0,"auto"),
("th-east","Thailand","East","Chanthaburi",12.61,102.10,3000,27.5,4,"sandy_loam","good",5,1,0,1,1,0,"auto"),
("th-west","Thailand","West","Kanchanaburi",14.02,99.53,1300,27.5,5,"loam","good",4,1,0,1,0,0,"auto"),
("th-south","Thailand","South","Surat Thani",9.14,99.33,1800,27.5,2,"sandy_loam","moderate",4,2,0,1,1,0,"auto"),
("vn-northern-mtn","Vietnam","Northern Midlands and Mountains","Son La",21.33,103.91,1400,21,5,"loam","good",25,0,0,1,0,0,"auto"),
("vn-red-river","Vietnam","Red River Delta","Thai Binh",20.45,106.34,1700,24,3,"silty_clay_loam","moderate",0.3,2,1,3,0,0,"auto"),
("vn-north-central","Vietnam","North Central Coast","Vinh",18.68,105.68,1900,24.5,3,"sandy_loam","good",3,2,1,2,0,0,"auto"),
("vn-south-central","Vietnam","South Central Coast","Ninh Thuan",11.57,108.99,700,27,8,"sandy_loam","good",3,1,1,1,0,0,"auto"),
("vn-central-highlands","Vietnam","Central Highlands","Buon Ma Thuot",12.67,108.04,1900,23.5,4,"clay_loam","good",6,0,0,1,1,0,"auto"),
("vn-southeast","Vietnam","Southeast","Tay Ninh",11.31,106.10,1800,27.5,4,"sandy_loam","good",2,1,0,2,0,0,"auto"),
("vn-mekong","Vietnam","Mekong Delta","Soc Trang",9.60,105.97,1700,27.5,4,"clay","poor",0.1,3,3,3,0,0,"curated"),
("kh-tonle-sap","Cambodia","Tonle Sap Plain","Battambang",13.10,103.20,1400,27.5,5,"sandy_loam","moderate",1,2,0,1,0,0,"curated"),
("kh-mekong-plain","Cambodia","Mekong Plain","Prey Veng",11.49,105.32,1400,27.5,5,"clay","poor",0.2,3,0,2,0,0,"auto"),
("kh-plateau","Cambodia","Plateau and Mountains","Banlung",13.74,106.99,2200,25,4,"clay_loam","good",6,0,0,0,0,0,"auto"),
("kh-coastal","Cambodia","Coastal","Kampot",10.61,104.18,2000,27.5,4,"clay","poor",0.5,1,2,1,0,0,"auto"),
]
R += [
("my-kedah-perlis","Malaysia","Kedah-Perlis (Muda rice area)","Alor Setar",6.12,100.37,2200,27.5,3,"clay","poor",0.5,2,1,3,0,0,"auto"),
("my-kelantan","Malaysia","Kelantan Plain","Kota Bharu",6.13,102.24,2500,27,3,"sandy_loam","moderate",1,3,1,2,0,1,"auto"),
("my-selangor","Malaysia","Selangor Coastal Plain (Sekinchan)","Sekinchan",3.50,101.10,2400,27.5,2,"clay","poor",0.3,2,1,3,0,0,"auto"),
("my-cameron","Malaysia","Cameron Highlands","Tanah Rata",4.47,101.38,2700,18,2,"clay_loam","good",25,0,0,2,0,0,"auto"),
("my-johor","Malaysia","Johor (Kluang-Pontian)","Kluang",2.03,103.32,2400,27,2,"sandy_loam","good",3,1,0,1,1,0,"auto"),
("my-pahang","Malaysia","Pahang Interior","Jerantut",3.94,102.36,2000,27,3,"clay_loam","good",5,2,0,1,1,0,"auto"),
("my-sarawak","Malaysia","Sarawak Lowlands (Borneo)","Sibu",2.29,111.83,3000,27,1,"clay","poor",1,2,0,1,1,0,"auto"),
("my-sabah","Malaysia","Sabah Interior (Borneo)","Keningau",5.34,116.16,2000,26.5,3,"clay_loam","moderate",3,2,0,1,0,0,"auto"),
]
RC = ["id","country","region","place","lat","lon","rain_mm_approx","mean_temp_c_approx","dry_months_approx","soil_texture","drainage","slope_pct_approx","flood_risk_0_3","salinity_risk_0_3","irrigation_access_0_3","tree_crop_dominated","soil_degraded","data_tier"]
reg = pd.DataFrame(R, columns=RC)

COMMON = {
"mm-dry-zone":["groundnut","sesame","green_gram","pigeon_pea","sorghum","sunflower","chickpea"],
"mm-ayeyarwady":["rice","black_gram","green_gram"],
"mm-shan":["maize","potato","vegetables"],
"mm-kachin":["rice","maize"],
"mm-rakhine":["rice"],
"mm-tanintharyi":["cashew"],
"th-north":["maize","rice","vegetables","soybean"],
"th-isan":["rice","cassava","sugarcane","maize"],
"th-central":["rice","sugarcane"],
"th-east":["cassava"],
"th-west":["sugarcane","cassava","maize"],
"th-south":[],
"vn-northern-mtn":["maize","rice"],
"vn-red-river":["rice","vegetables","maize","potato"],
"vn-north-central":["rice","groundnut","maize"],
"vn-south-central":["rice","maize","vegetables"],
"vn-central-highlands":["maize","vegetables"],
"vn-southeast":["cassava","sugarcane"],
"vn-mekong":["rice","watermelon","vegetables","maize"],
"kh-tonle-sap":["rice","cassava","soybean","maize"],
"kh-mekong-plain":["rice","vegetables","maize"],
"kh-plateau":["cassava","cashew","maize"],
"kh-coastal":["rice","vegetables"],
}
COMMON.update({
"my-kedah-perlis":["rice","watermelon"],"my-kelantan":["rice","vegetables"],"my-selangor":["rice"],
"my-cameron":["vegetables"],"my-johor":["pineapple","oil_palm","rubber"],"my-pahang":["oil_palm","rubber"],
"my-sarawak":["oil_palm"],"my-sabah":["rice","vegetables"]})
for k,v in {"mm-tanintharyi":["rubber","oil_palm"],"th-south":["rubber","oil_palm"],"th-east":["rubber"],
            "vn-southeast":["rubber"],"vn-central-highlands":["rubber"],"kh-plateau":["rubber"]}.items(): COMMON[k]+=v
EVID = {
"mm-dry-zone":("Cornish et al. 2018 Agric. Syst. 164:47-57 (rain 754 mm, 180-day season, 1951-2016); Herridge et al. 2019 Agric. Syst. 169:31-40; Denton et al.; ICRISAT 2004 IJAS 2(2):98-108; FAO Yezin soil science slides","medium"),
"th-isan":("Khon Kaen mean 1190 mm / 27.4 C (FAO ag125e, 1951-75 means); Toomsan et al. (legumes in NE Thailand, ICRISAT); Vityakon 2007 sandy soil review; Rambo 2017 SEAS 6(2); Mahasarakham Univ. 2020 rice economy","medium"),
}

WET={"mm-dry-zone":(5,10),"mm-ayeyarwady":(5,10),"mm-shan":(5,10),"mm-kachin":(5,10),"mm-rakhine":(5,10),"mm-tanintharyi":(5,11),
"th-north":(5,10),"th-isan":(5,10),"th-central":(5,10),"th-east":(5,11),"th-west":(5,10),"th-south":(5,12),
"vn-northern-mtn":(5,9),"vn-red-river":(5,10),"vn-north-central":(8,12),"vn-south-central":(9,12),"vn-central-highlands":(5,10),"vn-southeast":(5,11),"vn-mekong":(5,11),
"kh-tonle-sap":(5,10),"kh-mekong-plain":(5,10),"kh-plateau":(5,10),"kh-coastal":(5,11),
"my-kedah-perlis":(4,11),"my-kelantan":(10,1),"my-selangor":(3,11),"my-cameron":(3,11),"my-johor":(10,1),"my-pahang":(10,1),"my-sarawak":(10,3),"my-sabah":(10,2)}
reg["wet_season_start_month_approx"]=[WET[i][0] for i in reg.id]
reg["wet_season_end_month_approx"]=[WET[i][1] for i in reg.id]
reg["calendar_confidence"]=["medium (monsoon May-Oct per Cornish 2018)" if i=="mm-dry-zone" else "low - rough monsoon pattern, check local calendar" for i in reg.id]
reg["climate_values_source"]=[("sourced from literature (see evidence_sources)" if i in EVID else "approximate general knowledge - verify with POWER/IMERG") for i in reg.id]
reg["evidence_sources"]=[EVID.get(i,("General agronomy knowledge only - not yet verified; check FAO GIEWS, USDA FAS crop calendars, national statistics",""))[0] for i in reg.id]
reg["confidence"]=[EVID.get(i,("","low"))[1] for i in reg.id]
reg["rotation_relevance"]=["low (tree crops dominate; use intercrop/cover-crop plans)" if t else "normal" for t in reg.tree_crop_dominated]
reg["common_crops_in_area"]=["|".join(COMMON[i]) for i in reg.id]

# ---------------- CROPS ----------------
# id,name,family,season,water_need,N,root,drought,frost,tmin,tmax,days,erosion,om,market,forage,flood_tol,sal_tol,sandy_ok,rain_need_mm,needs_flat,dry_season_crop,role,pest_notes,plain
C = [
("rice","Rice (lowland)","grass","wet season",5,False,"shallow",1,1,20,35,120,2,2,5,1,5,2,2,1200,True,False,"main crop","Blast, stem borer, brown planthopper; needs standing water","The staple food crop. Grows best on flat land that holds water."),
("salt_rice","Salt-tolerant rice","grass","wet season",5,False,"shallow",2,1,20,35,125,2,2,4,1,5,4,2,1100,True,False,"main crop","Same pests as rice; yield drops as salt rises","Rice varieties bred to survive salty water in coastal deltas."),
("maize","Maize","grass","wet or dry season",3,False,"deep",2,1,18,33,110,3,3,4,3,2,1,3,600,False,False,"main crop","Fall armyworm, stem borer; heavy nitrogen user","A tall cereal for grain and animal feed. Needs steady water and fertiliser."),
("soybean","Soybean","legume","wet or dry season",3,True,"medium",2,1,20,32,100,3,4,4,3,2,1,3,500,False,False,"break crop","Rust, pod borers, bean fly","A protein crop that adds nitrogen to the soil for the next crop."),
("groundnut","Groundnut (peanut)","legume","wet season",3,True,"medium",3,1,22,33,100,3,4,4,2,2,1,5,500,False,False,"break crop","Leaf spot, aflatoxin in storage, needs phosphorus","An oil and food legume that suits sandy soil and fixes nitrogen."),
("green_gram","Green gram (mung bean)","legume","wet or dry season",2,True,"medium",4,1,22,35,65,3,4,4,2,1,1,4,350,False,False,"break crop","Pod borer, yellow mosaic virus; spoils if harvest rains","A very short pulse that fits between main crops and fixes nitrogen."),
("black_gram","Black gram","legume","wet or dry season",2,True,"medium",3,1,22,35,85,3,4,4,2,2,1,3,400,False,False,"break crop","Yellow mosaic virus, pod borer","A short pulse grown after rice on leftover soil moisture."),
("cowpea","Cowpea","legume","wet season",2,True,"deep",4,1,22,35,75,4,4,3,4,1,1,5,400,False,False,"break crop / cover","Aphids, pod borers","A hardy bean for poor, sandy, hot fields. Also good as animal feed or green manure."),
("pigeon_pea","Pigeon pea","legume","wet to dry season",2,True,"deep",5,1,20,35,180,4,5,4,3,1,1,4,600,False,False,"break crop / windbreak","Pod borer, wilt; slow early growth","A deep-rooted pulse that survives drought and can shelter other crops from wind."),
("chickpea","Chickpea","legume","post-monsoon",2,True,"deep",4,2,15,30,100,2,4,4,2,1,1,3,300,False,True,"break crop","Pod borer, wilt; fails if soil dries too early","A cool-season pulse grown on moisture left after the monsoon."),
("sesame","Sesame","oilseed","wet season",2,False,"deep",4,1,24,35,95,2,2,5,1,1,1,4,400,False,False,"cash crop","Leaf spot, webworm; hates waterlogging","A heat-loving oil crop with a strong market. Little soil cover."),
("sunflower","Sunflower","oilseed","wet season",2,False,"deep",4,2,18,33,100,3,3,3,2,1,2,3,450,False,False,"cash crop","Birds, downy mildew, head rot in rain","An oil crop with deep roots that tolerates heat and dry spells."),
("sorghum","Sorghum","grass","wet season",2,False,"deep",5,1,22,35,110,3,3,2,4,2,2,4,450,False,False,"cereal break","Shoot fly, birds, grain mould in rain","A drought-tough cereal. Breaks disease cycles in legume-heavy fields."),
("cassava","Cassava","root crop","8-12 months",2,False,"deep",4,1,22,34,300,4,2,4,2,2,1,5,900,False,False,"cash crop","Mosaic disease, mealybug; drains soil nutrients","A starchy root that tolerates drought and sandy soil but exhausts the soil."),
("sugarcane","Sugarcane","grass","10-12 months",4,False,"deep",3,1,22,35,330,4,3,4,2,2,2,3,1500,False,False,"cash crop","Borers, smut; needs mill within haul distance","A long-season cash crop that needs a nearby sugar mill."),
("potato","Potato","tuber","cool season",3,False,"shallow",1,2,12,24,95,2,2,4,1,1,1,3,450,False,True,"cash crop","Late blight, bacterial wilt","A cool-weather tuber. Only suits highlands or the cool dry season."),
("watermelon","Watermelon","cucurbit","dry season",3,False,"medium",3,1,22,35,80,1,1,4,1,1,2,5,400,False,True,"cash crop","Fusarium wilt, aphids, fruit fly","A quick dry-season fruit on sandy beds with irrigation."),
("vegetables","Mixed vegetables","various","all year with water",3,False,"shallow",2,1,18,32,70,2,2,4,1,1,1,3,400,False,True,"cash crop","Many pests; needs steady water","Short-cycle vegetables for local markets near towns."),
("cashew","Cashew","tree","perennial",2,False,"deep",5,1,22,35,365,4,3,4,1,1,2,5,1000,False,False,"perennial","Tea mosquito bug, anthracnose","A drought-tolerant tree crop. Not a rotation crop, but fits dry upland."),
("sunn_hemp","Sunn hemp (green manure)","legume","wet season",2,True,"deep",4,1,22,35,60,4,5,1,3,1,1,5,400,False,False,"green manure","Few pests; seed supply can be hard","A fast legume grown to be ploughed in, to rebuild poor sandy soil."),
("cover_legume","Legume cover crop (e.g. Pueraria)","legume","perennial",3,True,"deep",4,1,22,35,365,5,5,1,3,3,1,4,800,False,False,"cover crop","Can smother young trees if unmanaged","A ground-cover legume between young tree crops. Fixes nitrogen and stops erosion."),
]
C += [
("pineapple","Pineapple","bromeliad","12-18 months",2,False,"shallow",4,1,22,32,450,3,2,4,1,1,1,4,800,False,False,"cash crop","Mealybug wilt, heart rot in waterlogged soil","A hardy fruit grown on well-drained sandy or peat-edge soils, mainly for cash."),
("sweet_potato","Sweet potato","root crop","wet or dry season",2,False,"medium",4,1,20,30,120,4,3,3,3,2,2,5,500,False,False,"cash crop","Weevil, vine borer; rots in waterlogged soil","A hardy root crop with ground-covering vines. Tolerates poor sandy soil."),
("oil_palm","Oil palm","tree","perennial",4,False,"deep",2,1,22,33,365,4,4,5,1,3,2,3,1800,False,False,"perennial","Basal stem rot, rhinoceros beetle; needs steady rain","The main plantation tree crop in humid lowlands. Not a rotation crop."),
("rubber","Rubber","tree","perennial",4,False,"deep",2,1,22,34,365,4,4,3,1,2,1,3,1500,False,False,"perennial","Leaf fall disease, root disease; low latex price risk","A plantation tree crop in humid lowlands. Not a rotation crop."),
]
CC=["id","name","family","season","water_need","nitrogen_fixing","root_depth","drought_tolerance","frost_tolerance","temp_min_c","temp_max_c","season_days","erosion_cover","organic_matter","market","forage_value","flood_tolerance","salinity_tolerance","sandy_soil_ok","seasonal_rain_need_mm","needs_flat_land","dry_season_crop","role","pest_notes","plain_description"]
crops = pd.DataFrame(C, columns=CC)


ROUGH={ # yield_low,yield_high,unit,n_fixed,fert,labour,seed,pest,storage,income,good_after,avoid_after,tip
"rice":(3,5,"t/ha paddy","none",4,5,2,3,2,3,"green_gram|black_gram|cowpea|soybean","","Level the field and keep 3-5 cm of water in early growth; use certified seed."),
"salt_rice":(2.5,4,"t/ha paddy","none",3,5,3,3,2,3,"green_gram|black_gram","","Check salinity before planting and sow when river salinity is low."),
"maize":(3,6,"t/ha grain","none",5,3,3,4,2,3,"soybean|groundnut|green_gram|cowpea|sunn_hemp","maize","Split nitrogen into 2-3 doses and scout for fall armyworm early."),
"soybean":(1.2,2.2,"t/ha","~50-100 kg N/ha (rough)",2,3,3,4,2,3,"maize|rice|sorghum|sugarcane","soybean","Inoculate seed with rhizobium on fields new to soybean; watch for rust."),
"groundnut":(1.2,2.5,"t/ha dry pods","~40-100 kg N/ha (rough)",2,4,4,3,4,4,"maize|sorghum|rice|cassava","groundnut|soybean","Add phosphorus and lime or gypsum on sandy soil; dry pods fully to avoid aflatoxin."),
"green_gram":(0.6,1.2,"t/ha","~30-60 kg N/ha (rough)",1,3,2,3,2,3,"rice|maize|sorghum","green_gram|black_gram|cowpea","Sow evenly so pods ripen together and harvest before heavy rain."),
"black_gram":(0.6,1.0,"t/ha","~30-60 kg N/ha (rough)",1,3,2,3,2,3,"rice|maize|sorghum","black_gram|green_gram","Good after rice on leftover moisture; control yellow mosaic virus carriers (whitefly)."),
"cowpea":(0.8,1.5,"t/ha dry seed","~40-80 kg N/ha (rough)",1,3,2,3,2,2,"maize|sorghum|cassava|rice","cowpea|green_gram","Cut green stems as fodder or green manure after harvesting the seed."),
"pigeon_pea":(0.8,1.5,"t/ha","~40-80 kg N/ha (rough)",1,3,2,3,2,3,"maize|sorghum|rice","pigeon_pea","Slow early growth, so intercrop with sesame or groundnut and weed early."),
"chickpea":(0.8,1.5,"t/ha","~30-70 kg N/ha (rough)",1,3,3,3,2,4,"rice|sorghum|maize","chickpea","Sow soon after the monsoon while soil is moist; treat seed against wilt."),
"sesame":(0.4,0.8,"t/ha","none",2,3,2,3,2,4,"groundnut|pigeon_pea|green_gram|sorghum","sesame","Thin early, avoid waterlogging, harvest when lower capsules turn yellow."),
"sunflower":(1.0,2.0,"t/ha","none",3,3,3,3,2,3,"green_gram|cowpea|rice|sorghum","sunflower","Protect heads from birds and avoid flowering in the wettest weeks."),
"sorghum":(1.5,3.0,"t/ha grain","none",3,3,2,3,2,2,"groundnut|green_gram|pigeon_pea|soybean","sorghum","A good cereal break after legumes; scare birds near harvest."),
"cassava":(15,30,"t/ha fresh roots","none",3,4,3,3,5,3,"groundnut|green_gram|cowpea|sunn_hemp","cassava","Use disease-free stakes, add organic matter, and sell roots within 1-2 days of harvest."),
"sugarcane":(50,80,"t/ha cane","none",4,5,4,3,5,3,"soybean|groundnut|green_gram|cowpea","","Only worthwhile within reach of a mill; legumes between cycles rebuild soil."),
"potato":(15,25,"t/ha tubers","none",5,5,5,5,4,4,"maize|green_gram|cowpea","potato|vegetables","Use certified seed tubers, hill the soil, and watch for late blight."),
"watermelon":(15,30,"t/ha fruit","none",3,4,4,4,4,4,"rice|green_gram|cowpea","watermelon","Mulch and use drip irrigation; do not repeat on the same bed."),
"vegetables":(10,25,"t/ha (varies by vegetable)","none",4,5,4,5,5,5,"green_gram|cowpea|maize","vegetables","Choose short crops near a market and rotate plant families."),
"cashew":(0.5,1.0,"t/ha raw nuts (mature trees)","none",2,3,3,3,2,4,"","","Slow to bear (3+ years); intercrop young trees with legumes."),
"sunn_hemp":(5,8,"t/ha dry biomass (ploughed in)","~80-150 kg N/ha in biomass (rough)",1,2,2,1,1,1,"","","Plough in at flowering (about 45-60 days) to build organic matter."),
"cover_legume":(4,8,"t/ha biomass","~80-150 kg N/ha in biomass (rough)",1,2,3,1,1,1,"","","Keep a strip clear around young trees so the cover does not smother them."),
"pineapple":(30,50,"t/ha fruit","none",4,4,4,3,4,4,"","pineapple","Needs well-drained soil; plant on raised beds and mulch."),
"sweet_potato":(10,20,"t/ha tubers","none",2,3,2,2,3,3,"rice|maize|green_gram","sweet_potato","Use cuttings from healthy vines; avoid waterlogged soil."),
"oil_palm":(15,25,"t/ha fresh fruit bunches","none",4,4,5,3,2,5,"","","Plantation crop with about 3 years to first harvest; cover-crop young rows."),
"rubber":(1.2,1.8,"t/ha dry rubber","none",3,5,5,3,2,3,"","","Tapping needs skilled labour and prices swing."),
}
RK=["rough_yield_low","rough_yield_high","yield_unit","n_fixed_kg_ha_rough","fertiliser_need_1_5","labour_need_1_5","seed_cost_1_5","pest_difficulty_1_5","storage_difficulty_1_5","relative_income_1_5","good_after","avoid_after","farmer_tip"]
for j,k in enumerate(RK): crops[k]=[ROUGH[i][j] for i in crops.id]

# ---------------- SCORING ----------------
clamp=lambda x,a=0.0,b=1.0:max(a,min(b,x))
PERENN={"cashew","cover_legume","oil_palm","rubber"}
def score(r,c):
    wet_days=(12-r.dry_months_approx)*30
    # climate
    T=r.mean_temp_c_approx
    d=0 if c.temp_min_c<=T<=c.temp_max_c else min(abs(T-c.temp_min_c),abs(T-c.temp_max_c))
    climate=clamp(1-d/8)
    if c.id=="potato" and T>24: climate=min(climate,clamp(1-(T-24)/6))
    # season window (short rainfed crops only)
    if c.season_days<180 and not c.dry_season_crop:
        win=wet_days+r.irrigation_access_0_3*40
        if c.season_days>win: climate*=clamp(win/c.season_days+0.1*(c.drought_tolerance-3))
    # water
    rs=r.rain_mm_approx*0.85
    need=c.seasonal_rain_need_mm
    ratio=rs/need+r.irrigation_access_0_3*0.15
    if c.dry_season_crop: ratio=max(ratio,0.5+0.15*r.irrigation_access_0_3)
    f=1.8-0.25*c.drought_tolerance
    water=1.0 if ratio>=1 else clamp(1-(1-ratio)*f)
    if r.rain_mm_approx>2500 and c.drought_tolerance>=4:
        water*=1-0.5*clamp((r.rain_mm_approx-2500)/2500)*(c.drought_tolerance-2)/3
    # soil
    tex=r.soil_texture
    if tex=="sandy": soil=0.4+0.12*c.sandy_soil_ok
    elif tex=="sandy_loam": soil=clamp(0.7+0.06*c.sandy_soil_ok)
    else: soil=1.0
    if r.drainage=="poor": soil=min(soil,0.4+0.12*c.flood_tolerance)
    if c.needs_flat_land and r.slope_pct_approx>5: soil*=0.5
    # risk
    flood_pen=r.flood_risk_0_3/3*(5-c.flood_tolerance)/4
    sal_pen=r.salinity_risk_0_3/3*(5-c.salinity_tolerance)/4
    ero_pen=clamp(r.slope_pct_approx/25)*(5-c.erosion_cover)/4
    risk=clamp(1-(0.5*flood_pen+0.3*sal_pen+0.2*ero_pen))
    # benefit
    need_soil=1 if (r.soil_degraded or r.soil_texture in("sandy","sandy_loam")) else 0.4
    N=1 if c.nitrogen_fixing else 0
    ben=clamp(0.35*N*(0.6+0.4*need_soil)+0.25*c.erosion_cover/5*(0.5+clamp(r.slope_pct_approx/15))+0.2*c.market/5+0.2*c.organic_matter/5)
    eps=0.05
    fit=100*((climate+eps)/(1+eps))**0.30*((water+eps)/(1+eps))**0.25*((soil+eps)/(1+eps))**0.20*((risk+eps)/(1+eps))**0.15*((ben+eps)/(1+eps))**0.10
    # soil-draining crops on already degraded soil; no-income soil-improvement crops
    if c.id in("cassava","sugarcane","maize") and (r.soil_degraded or r.soil_texture=="sandy"): fit*=0.92
    if c.role in("green manure","cover crop"): fit*=0.85
    if c.id in("oil_palm","rubber","cashew") and not r.tree_crop_dominated and c.id not in COMMON[r.id]: fit*=0.75
    common = c.id in COMMON[r.id]
    if common: fit+=5
    if r.tree_crop_dominated and c.id not in PERENN: fit*=0.85
    if r.tree_crop_dominated and c.id in PERENN: fit+=4
    if (not r.tree_crop_dominated) and c.id=="cover_legume": fit*=0.8
    fit=95*clamp((fit-50)/50)
    return dict(climate=climate,water=water,soil=soil,risk=risk,benefit=ben,fit=round(fit,1),common=common,
                rs=rs,need=need,wet_days=wet_days,T=T)

def limits_and_why(r,c,s):
    lim=[]
    if s["climate"]<0.7:
        if not(c.temp_min_c<=s["T"]<=c.temp_max_c): lim.append(f"temperature (area ~{s['T']:.0f} C, crop prefers {c.temp_min_c}-{c.temp_max_c} C)")
        else: lim.append(f"season ({c.season_days} days vs ~{s['wet_days']} wet days)")
    if s["water"]<0.7: lim.append(f"rainfall (needs ~{s['need']} mm, area gets ~{s['rs']:.0f} mm in season)")
    if s["soil"]<0.75:
        lim.append("sandy, low-water-holding soil" if r.soil_texture in("sandy","sandy_loam") and c.sandy_soil_ok<4 else ("waterlogged/heavy soil" if r.drainage=="poor" else "slope too steep for flat-land crop"))
    if s["risk"]<0.8:
        if r.salinity_risk_0_3>=2 and c.salinity_tolerance<=2: lim.append("salinity risk")
        if r.flood_risk_0_3>=2 and c.flood_tolerance<=2: lim.append("flood risk")
        if r.slope_pct_approx>=8 and c.erosion_cover<=3: lim.append("erosion on slopes")
    why=[]
    if s["water"]>=0.9 and not c.dry_season_crop: why.append(f"rainfall (~{s['rs']:.0f} mm in season) covers its water need" if s['rs']>=c.seasonal_rain_need_mm else "drought tolerance suits the rainfall")
    if s["climate"]>=0.95: why.append(f"temperature (~{s['T']:.0f} C) is in its range")
    if c.nitrogen_fixing and (r.soil_degraded or r.soil_texture in("sandy","sandy_loam")): why.append("fixes nitrogen on low-fertility soil")
    elif c.nitrogen_fixing: why.append("fixes nitrogen for the next crop")
    if s["soil"]>=0.95 and r.soil_texture in("sandy","sandy_loam"): why.append("copes with sandy soil")
    if c.id in("rice","salt_rice") and r.flood_risk_0_3>=2 and c.flood_tolerance>=4: why.append("tolerates standing water and flooding")
    if c.id=="salt_rice" and r.salinity_risk_0_3>=2: why.append("tolerates salty water")
    if s["common"]: why.append("already grown locally (farmer know-how, market)")
    if not why: why.append("moderate match on climate, water and soil")
    return "; ".join(lim), "; ".join(why[:3])

rows=[]
for _,r in reg.iterrows():
    tmp=[]
    for _,c in crops.iterrows():
        s=score(r,c); lim,why=limits_and_why(r,c,s)
        tmp.append((r.id,c.id,s,lim,why,c))
    tmp.sort(key=lambda t:-t[2]["fit"])
    for rank,(rid,cid,s,lim,why,c) in enumerate(tmp,1):
        band="high" if s["fit"]>=75 else ("medium" if s["fit"]>=55 else "low")
        rows.append(dict(region_id=rid,country=r.country,region=r.region,rank=rank,crop_id=cid,crop_name=c["name"],role=c.role,
            fit=s["fit"],fit_band=band,climate_part=round(s["climate"],2),water_part=round(s["water"],2),soil_part=round(s["soil"],2),
            risk_part=round(s["risk"],2),benefit_part=round(s["benefit"],2),common_locally=s["common"],trend="tbd (needs NDVI/IMERG/POWER trends)",
            limits=lim,why=why,confidence=r.confidence if r.confidence else "low",
            basis="rule-based score from approximate region priors + crop traits; NOT yet computed from NASA time series"))
fit=pd.DataFrame(rows)


MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
mn=lambda m:MN[(int(m)-1)%12]
regd=reg.set_index("id"); crd=crops.set_index("id")
def window(rid,cid):
    r=regd.loc[rid]; c=crd.loc[cid]; st=int(r.wet_season_start_month_approx); en=int(r.wet_season_end_month_approx)
    if cid in("cashew","oil_palm","rubber","cover_legume","pineapple"): return f"{mn(st)}-{mn(st+1)} (start of wet season)",(st+1)
    if cid=="chickpea": return f"{mn(en)}-{mn(en+1)} (after monsoon, on residual moisture)",en
    if c.dry_season_crop:
        if r.dry_months_approx<=2: return "year-round; avoid the heaviest rain weeks",st
        return f"{mn(en+1)}-{mn(en+2)} (dry season; needs irrigation or residual moisture)",en+1
    if "wet or dry" in c.season and r.dry_months_approx>=3: return f"wet season {mn(st)}-{mn(st+1)}; or dry season {mn(en+1)}-{mn(en+2)} if moisture allows",st
    return f"{mn(st)}-{mn(st+1)}",st
def harvest(start,days): return mn(start+max(1,round(days/30)))
lab=lambda f:"Very good fit" if f>=85 else("Good fit" if f>=75 else("Possible fit" if f>=55 else "Poor fit"))
def rtip(rid,cid):
    r=regd.loc[rid]; c=crd.loc[cid]
    if cid in("sunn_hemp","cover_legume"): return "Soil-building crop with no direct income; plough in or use as ground cover."
    if cid in("cashew","oil_palm","rubber"): return "Perennial tree crop, not a rotation crop; use a legume cover between young rows."
    if c.nitrogen_fixing:
        t="Good before cereals, maize or cassava because it leaves nitrogen in the soil."
        if r.soil_degraded or r.soil_texture in("sandy","sandy_loam"): t+=" Especially useful on this area's low-fertility soil."
        return t
    if c.family=="grass": return "Plant after a legume to cut fertiliser need and break disease cycles."
    return "Rotate with a legume or cereal; avoid repeating it on the same plot."
W,H,YR,SL,RT,AD=[],[],[],[],[],[]
for _,x in fit.iterrows():
    c=crd.loc[x.crop_id]; w,st=window(x.region_id,x.crop_id)
    W.append(w); H.append("~"+harvest(st,c.season_days)+" (rough)" if x.crop_id not in("cashew","oil_palm","rubber","cover_legume") else "multi-year")
    YR.append(f"{c.rough_yield_low:g}-{c.rough_yield_high:g} {c.yield_unit}")
    RT.append(rtip(x.region_id,x.crop_id))
fit["fit_label"]=[lab(f) for f in fit.fit]
fit["suggested_planting_window"]=W
fit["approx_harvest_month"]=H
fit["rough_typical_yield"]=YR
fit["yield_outlook_here"]=["upper half of typical range" if f>=75 else("middle of range" if f>=55 else "lower end or at risk") for f in fit.fit]
fit["n_fixed_kg_ha_rough"]=[crd.loc[i].n_fixed_kg_ha_rough for i in fit.crop_id]
for k,col in [("fertiliser_need_1_5","fertiliser_need_1_5"),("labour_need_1_5","labour_need_1_5"),("seed_cost_1_5","seed_cost_1_5"),("pest_difficulty_1_5","pest_difficulty_1_5"),("storage_difficulty_1_5","storage_difficulty_1_5"),("relative_income_1_5","relative_income_1_5")]:
    fit[col]=[crd.loc[i][k] for i in fit.crop_id]
fit["rotation_tip_here"]=RT
fit["good_after"]=[crd.loc[i].good_after for i in fit.crop_id]
fit["avoid_after"]=[crd.loc[i].avoid_after for i in fit.crop_id]
fit["farmer_tip"]=[crd.loc[i].farmer_tip for i in fit.crop_id]
fit["calendar_confidence"]=[regd.loc[i].calendar_confidence for i in fit.region_id]
fit["summary_line"]=[f"#{x['rank']} {x.crop_name}: {x.fit_label} ({x.fit:g}/95). Plant {x.suggested_planting_window.split(' (')[0]}; harvest {x.approx_harvest_month}. Rough yield {x.rough_typical_yield}." for _,x in fit.iterrows()]
front=["region_id","country","region","rank","crop_id","crop_name","fit","fit_label","summary_line","role","suggested_planting_window","approx_harvest_month","rough_typical_yield","yield_outlook_here","limits","why","rotation_tip_here","good_after","avoid_after","farmer_tip","n_fixed_kg_ha_rough","fertiliser_need_1_5","labour_need_1_5","seed_cost_1_5","pest_difficulty_1_5","storage_difficulty_1_5","relative_income_1_5","fit_band","climate_part","water_part","soil_part","risk_part","benefit_part","common_locally","trend","confidence","calendar_confidence","basis"]
fit=fit[front]
top5=fit[fit["rank"]<=5][["region_id","country","region","rank","crop_name","fit","fit_label","suggested_planting_window","rough_typical_yield","why"]]
top5.to_csv("/mnt/user-data/outputs/sowcast_top5_by_region.csv",index=False)

# ---------------- ROTATIONS ----------------
RO = [
("mm-dry-zone","current","Groundnut, repeated (sole groundnut is the dominant pattern)","groundnut|groundnut","ICRISAT 2004; Herridge 2019 on narrow legume-heavy systems"),
("mm-dry-zone","alt_a","Groundnut then sorghum (cereal break for legume disease)","groundnut|sorghum","Herridge 2019: lack of broadleaf/cereal balance causes disease and yield loss"),
("mm-dry-zone","alt_b","Green gram early monsoon then chickpea on residual moisture; pigeon pea as windbreak","green_gram|chickpea","Pigeon pea windbreak per FAO Yezin slides; chickpea timing needs local check"),
("mm-ayeyarwady","current","Rice then fallow","rice|fallow","general knowledge - verify"),
("mm-ayeyarwady","alt_a","Rice then black gram on residual moisture","rice|black_gram","general knowledge - verify"),
("mm-ayeyarwady","alt_b","Rice then dry-season maize","rice|maize","general knowledge - verify"),
("mm-shan","current","Maize then fallow","maize|fallow","general knowledge - verify"),
("mm-shan","alt_a","Maize then soybean","maize|soybean","general knowledge - verify"),
("mm-shan","alt_b","Potato, maize, then cowpea with contour hedgerows","potato|maize|cowpea","general knowledge - verify"),
("mm-kachin","current","Upland rice, then fallow (shifting)","rice|fallow","general knowledge - verify"),
("mm-kachin","alt_a","Upland rice then soybean","rice|soybean","general knowledge - verify"),
("mm-kachin","alt_b","Maize then cowpea, planted along contours","maize|cowpea","general knowledge - verify"),
("mm-rakhine","current","Rice then fallow","rice|fallow","general knowledge - verify"),
("mm-rakhine","alt_a","Rice then cowpea (short season)","rice|cowpea","general knowledge - verify"),
("mm-rakhine","alt_b","Rice then watermelon on dry-season beds","rice|watermelon","general knowledge - verify"),
("mm-tanintharyi","current","Rubber / oil palm (tree crops)","perennial_tree","general knowledge - verify"),
("mm-tanintharyi","alt_a","Tree crops with legume cover while young","perennial_tree+cover_legume","general knowledge - verify"),
("mm-tanintharyi","alt_b","Tree crops with vegetables between young rows","perennial_tree+vegetables","general knowledge - verify"),
("th-north","current","Upland maize, repeated","maize|maize","general knowledge - verify"),
("th-north","alt_a","Maize then soybean","maize|soybean","general knowledge - verify"),
("th-north","alt_b","Rice then green gram in the cool season","rice|green_gram","general knowledge - verify"),
("th-isan","current","Cassava or sugarcane, repeated (monocropping on sandy soil)","cassava|cassava","Vityakon 2007; Rambo 2017; Toomsan et al."),
("th-isan","alt_a","Cassava then sunn hemp / cowpea green manure","cassava|sunn_hemp","Green manure rotation improves degraded sandy soil (Thai research, Kasetsart/Khon Kaen)"),
("th-isan","alt_b","Rice then green gram (or groundnut) after harvest","rice|green_gram","Toomsan et al. on legumes in NE Thailand; adoption limited by seed and P"),
("th-central","current","Rice, rice","rice|rice","general knowledge - verify"),
("th-central","alt_a","Rice, rice, then green gram","rice|rice|green_gram","general knowledge - verify"),
("th-central","alt_b","Rice then maize","rice|maize","general knowledge - verify"),
("th-east","current","Cassava, repeated","cassava|cassava","general knowledge - verify"),
("th-east","alt_a","Cassava then green gram","cassava|green_gram","general knowledge - verify"),
("th-east","alt_b","Orchard with sunn hemp cover between rows","perennial_tree+sunn_hemp","general knowledge - verify"),
("th-west","current","Sugarcane, repeated","sugarcane|sugarcane","general knowledge - verify"),
("th-west","alt_a","Sugarcane then soybean between cycles","sugarcane|soybean","general knowledge - verify"),
("th-west","alt_b","Cassava then maize","cassava|maize","general knowledge - verify"),
("th-south","current","Rubber / oil palm (tree crops)","perennial_tree","general knowledge - verify"),
("th-south","alt_a","Tree crops with legume cover while young","perennial_tree+cover_legume","general knowledge - verify"),
("th-south","alt_b","Tree crops with vegetables between young rows","perennial_tree+vegetables","general knowledge - verify"),
("vn-northern-mtn","current","Maize on slopes, repeated","maize|maize","general knowledge - verify"),
("vn-northern-mtn","alt_a","Maize then soybean","maize|soybean","general knowledge - verify"),
("vn-northern-mtn","alt_b","Maize with groundnut, grass strips along contours","maize+groundnut","general knowledge - verify"),
("vn-red-river","current","Rice, rice, winter vegetables","rice|rice|vegetables","general knowledge - verify"),
("vn-red-river","alt_a","Rice, rice, winter soybean","rice|rice|soybean","general knowledge - verify"),
("vn-red-river","alt_b","Rice, maize, vegetables","rice|maize|vegetables","general knowledge - verify"),
("vn-north-central","current","Rice, rice","rice|rice","general knowledge - verify"),
("vn-north-central","alt_a","Rice then groundnut","rice|groundnut","general knowledge - verify"),
("vn-north-central","alt_b","Rice then maize","rice|maize","general knowledge - verify"),
("vn-south-central","current","Rice then dry-season fallow","rice|fallow","general knowledge - verify"),
("vn-south-central","alt_a","Rice then green gram","rice|green_gram","general knowledge - verify"),
("vn-south-central","alt_b","Maize then groundnut","maize|groundnut","general knowledge - verify"),
("vn-central-highlands","current","Tree crops (coffee, pepper) with some maize","perennial_tree+maize","general knowledge - verify"),
("vn-central-highlands","alt_a","Annual land: maize then soybean","maize|soybean","general knowledge - verify"),
("vn-central-highlands","alt_b","Legume cover when replanting coffee","perennial_tree+cover_legume","general knowledge - verify"),
("vn-southeast","current","Cassava, repeated","cassava|cassava","general knowledge - verify"),
("vn-southeast","alt_a","Cassava then groundnut","cassava|groundnut","general knowledge - verify"),
("vn-southeast","alt_b","Rubber with legume cover in young years","perennial_tree+cover_legume","general knowledge - verify"),
("vn-mekong","current","Rice, rice, rice (triple rice)","rice|rice|rice","general knowledge - verify"),
("vn-mekong","alt_a","Rice, rice, then green gram","rice|rice|green_gram","general knowledge - verify; rice-shrimp is the usual choice in the saltiest areas"),
("vn-mekong","alt_b","Rice then watermelon in the dry season","rice|watermelon","general knowledge - verify"),
("kh-tonle-sap","current","Rice then fallow","rice|fallow","general knowledge - verify"),
("kh-tonle-sap","alt_a","Rice then green gram on residual moisture","rice|green_gram","general knowledge - verify"),
("kh-tonle-sap","alt_b","Cassava then soybean","cassava|soybean","general knowledge - verify"),
("kh-mekong-plain","current","Rice then vegetables","rice|vegetables","general knowledge - verify"),
("kh-mekong-plain","alt_a","Rice then green gram","rice|green_gram","general knowledge - verify"),
("kh-mekong-plain","alt_b","Rice then maize on flood-recession soil","rice|maize","general knowledge - verify"),
("kh-plateau","current","Cassava, repeated","cassava|cassava","general knowledge - verify"),
("kh-plateau","alt_a","Cassava then groundnut","cassava|groundnut","general knowledge - verify"),
("kh-plateau","alt_b","Maize then soybean","maize|soybean","general knowledge - verify"),
("kh-coastal","current","Salt-tolerant rice then fallow","salt_rice|fallow","general knowledge - verify"),
("kh-coastal","alt_a","Salt-tolerant rice then green gram","salt_rice|green_gram","general knowledge - verify"),
("kh-coastal","alt_b","Pepper / fruit trees with legume cover","perennial_tree+cover_legume","general knowledge - verify"),
]
RO += [
("my-kedah-perlis","current","Rice, rice (main season and off-season)","rice|rice","general knowledge - verify with MADA/DOA"),
("my-kedah-perlis","alt_a","Rice then green gram in the dry spell","rice|green_gram","general knowledge - verify"),
("my-kedah-perlis","alt_b","Rice then sweet corn / maize","rice|maize","general knowledge - verify"),
("my-kelantan","current","Rice then fallow","rice|fallow","general knowledge - verify"),
("my-kelantan","alt_a","Rice then groundnut on sandy coastal soil","rice|groundnut","general knowledge - verify"),
("my-kelantan","alt_b","Rice then watermelon","rice|watermelon","general knowledge - verify"),
("my-selangor","current","Rice, rice","rice|rice","general knowledge - verify"),
("my-selangor","alt_a","Rice then green gram","rice|green_gram","general knowledge - verify"),
("my-selangor","alt_b","Rice then vegetables","rice|vegetables","general knowledge - verify"),
("my-cameron","current","Vegetables, repeated","vegetables|vegetables","general knowledge - verify"),
("my-cameron","alt_a","Vegetables then maize (cereal break)","vegetables|maize","general knowledge - verify"),
("my-cameron","alt_b","Potato then vegetables, on terraces","potato|vegetables","general knowledge - verify"),
("my-johor","current","Oil palm / rubber / pineapple (plantation)","perennial_tree","general knowledge - verify"),
("my-johor","alt_a","Young palms with legume cover","perennial_tree+cover_legume","general knowledge - verify"),
("my-johor","alt_b","Pineapple then cowpea","pineapple|cowpea","general knowledge - verify"),
("my-pahang","current","Oil palm / rubber (plantation)","perennial_tree","general knowledge - verify"),
("my-pahang","alt_a","Young trees with legume cover","perennial_tree+cover_legume","general knowledge - verify"),
("my-pahang","alt_b","Young trees with vegetables between rows","perennial_tree+vegetables","general knowledge - verify"),
("my-sarawak","current","Oil palm / sago plantation","perennial_tree","general knowledge - verify"),
("my-sarawak","alt_a","Young palms with legume cover","perennial_tree+cover_legume","general knowledge - verify"),
("my-sarawak","alt_b","Rice then cowpea on mineral soil","rice|cowpea","general knowledge - verify"),
("my-sabah","current","Rice then fallow","rice|fallow","general knowledge - verify"),
("my-sabah","alt_a","Rice then green gram","rice|green_gram","general knowledge - verify"),
("my-sabah","alt_b","Maize then soybean","maize|soybean","general knowledge - verify"),
]
fitidx=fit.set_index(["region_id","crop_id"])["fit"].to_dict()
cropidx=crops.set_index("id")
out=[]
import re
for rid,opt,label,seq,src in RO:
    ids=[x for x in re.split(r"[|+]",seq) if x in cropidx.index]
    distinct=list(dict.fromkeys(ids))
    has_tree="perennial_tree" in seq
    avg=round(sum(fitidx[(rid,i)] for i in distinct)/len(distinct),1) if (distinct and not has_tree) else None
    nfix=any(cropidx.loc[i,"nitrogen_fixing"] for i in distinct)
    cereal=any(cropidx.loc[i,"family"]=="grass" for i in distinct)
    out.append(dict(region_id=rid,option=opt,label=label,sequence=seq,n_distinct_crops=len(distinct),has_fallow=("fallow" in seq),avg_crop_suitability=avg,
        has_nitrogen_fixer=nfix,has_cereal=cereal,cereal_legume_break=bool(nfix and cereal),
        note=("tree crop not scored in the table; suitability shown blank" if has_tree else "avg_crop_suitability = mean single-crop fit; it does not measure soil-health benefit of the sequence"),source_or_basis=src,confidence=("medium" if rid in EVID and src!="general knowledge - verify" else "low")))
rot=pd.DataFrame(out)

reg.to_csv("/mnt/user-data/outputs/sowcast_regions.csv",index=False)
crops.to_csv("/mnt/user-data/outputs/sowcast_crops.csv",index=False)
fit.to_csv("/mnt/user-data/outputs/sowcast_region_crop_fit.csv",index=False)
rot.to_csv("/mnt/user-data/outputs/sowcast_rotations.csv",index=False)
print(len(reg),len(crops),len(fit),len(rot))
