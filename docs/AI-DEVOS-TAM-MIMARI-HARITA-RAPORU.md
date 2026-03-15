# AI-DevOS Tam Mimari Harita Raporu

Bu rapor, repository'nin taranması sonucunda sistemin **gerçek mimari durumunu** yansıtır. Açıklamalar Türkçedir; teknik terimler gerektiğinde İngilizce bırakılmıştır.

---

## SECTION 1 — TAM MİMARİ AĞAÇ

Sistemin hiyerarşik mimari ağacı aşağıdadır. Her dalda ilgili klasörler, önemli modüller ve kritik dosyalar listelenmiştir.

---

### ROOTS (Kökler)

**Açıklama:** Araçlar, dokümantasyon ve eski (legacy) uygulama kalıntıları.

- **Mimari ve araçlar**
  - `architecture/`
    - `snapshot-v1.md` — Eski masaüstü uygulamasına ait mimari anlık görüntü
    - `snapshot-artifacts/` — Dosya ağacı, IPC, gate özetleri
  - `tools/`
    - `arch-snapshot.mjs` — Repo tarayıcı / mimari anlık görüntü aracı
    - `project-understanding/` — Bağımlılık grafiği, modül eşlemesi, risk hotspot’ları, ownership inference (ve testleri)
- **Legacy uygulama (AI-DevOS öncesi)**
  - `archive/legacy-etsy-mentor/`
    - Eski Electron main, DB entegrasyonu, IPC
    - Eski React UI, gate’ler, store
- **Konfigürasyon**
  - Kök: `package.json`, `tsconfig*.json`, `vite.config.ts`
  - CI: `.github/workflows/` (ör. gate-s7-stability-layer)
  - Dokümantasyon: `docs/architecture*.md`, `docs/architecture-audit/`, `docs/gates/`

---

### TRUNK (Gövde — Deterministik Çekirdek)

**Açıklama:** Bu katman deterministik onarım motorunu içerir. Tüm iş mantığı burada; yan etki yok.

- **Ana deterministik çekirdek**
  - `src/repair-engine/`
    - `orchestrator/` — Onarım koordinasyonu
    - `state-machine/` — Onarım durum makinesi
    - `strategy/` — Onarım stratejisi seçimi
    - `verdict/` — Karar motoru, güven skoru türetme
    - `run/` — Çalıştırma yaşam döngüsü, event log builder’lar
    - `queue/`, `queue-entry/` — Onarım kuyruğu ve giriş eşlemesi
    - `intake/` — Onarım motoru olay alımı
    - `routing/` — Karar/verdict yönlendirme
    - `operator/`, `operator-decision/` — Operatör karar yüzeyi modellemesi
    - `governance-runtime/` — Governance bağlama yüzeyi
    - `project-understanding-runtime/` — Proje anlama çalışma zamanı
    - `observability/` — Olay özetleri, timeline, liste öğeleri
    - `audit/` — Denetim kaydı builder’ları
    - `contracts/` — Hata taksonomisi, güven skoru, execution sözleşmeleri vb.
- **Kanıt:** `src/repair-engine/**/*.test.ts` altında yoğun unit testler; Electron import’u yok; sadece iş mantığı.

---

### GOVERNANCE (Governans)

**Açıklama:** Risk, bölge ve güvenlik politikası değerlendirmesi; operatör playbook’ları.

- **Governans mantığı**
  - `src/governance/`
    - `zones/` — Bölge sınıflandırması
    - `risk/` — Risk sınıflandırması
    - `security-policy/` — Güvenlik politikası değerlendirmesi
    - `policy-integration/` — Governance gate türetme
  - `src/operator/playbooks/` — Operatör playbook çözümleyici
- **Entegrasyon:** `src/repair-engine/governance-runtime/` üzerinden trunk’a bağlanır.

---

### GITHUB BACKBONE (GitHub Omurgası)

**Açıklama:** GitHub webhook’larından gelen sinyallerin alınması, PR incelemesi ve onarım girişine dönüştürülmesi.

- **Gelen GitHub akışı**
  - `src/github/event-intake/` — `normalize-github-event.ts` (webhook normalizasyonu)
  - `src/github/pr-inspection/` — `inspect-pull-request.ts`
  - `src/github/pr-intelligence/` — `derive-pr-intelligence.ts`, `pr-size-band.ts` vb.
- **Onarım giriş köprüsü**
  - `src/github/intake-bridge/` — `derive-github-repair-intake.ts`, `map-github-repair-intake-to-orchestrator-input.ts`
- **Electron runtime girişi**
  - `electron/runtime/webhook-intake/`
    - `parse-webhook-request.ts`, `webhook-intake-handler.ts` (tam pipeline)
    - `create-webhook-server.ts`, `start-webhook-server.ts`
  - `electron/runtime/webhook-security/` — İmza doğrulama

---

### HERO MINISTRY (Hero Bakanlığı)

**Açıklama:** AI hero’ları analiz yapar; yalnızca danışmanlık (advisory) üretir, yürütme yetkisi yoktur.

- **Hero sözleşmeleri ve orkestrasyon**
  - `src/heroes/`
    - `contracts/`, `core/`, `selection/`, `pipeline/`, `runtime/`
    - `heroes/` — analysis, repair, security, dependency, ci-failure, escalation, refactor, review vb. hero’lar
    - `decision/`, `projection/` — Karar çerçevesi ve projeksiyon eşlemesi
- **Electron hero runtime**
  - `electron/runtime/heroes-runtime/`
    - `hero-runtime-input.ts`, `hero-runtime-result.ts`, `run-heroes-runtime.ts`
    - `hero-runtime-selection.ts`, `hero-runtime-invocation.ts`, `hero-runtime-advisory.ts`
    - `runtime-hero-status.ts`, `runtime-hero-advisory-entry.ts`

---

### RUNTIME ADAPTER LAYER (Çalışma Zamanı Adaptör Katmanı)

**Açıklama:** Electron runtime modülleri; harici sistemleri (GitHub, repair engine, hero’lar) entegre eder.

- **Repair-engine köprüsü**
  - `electron/runtime/repair-engine-bridge/`
    - `map-electron-input-to-orchestrator-input.ts`, `map-orchestrator-result-to-electron-result.ts`
    - `run-electron-repair-bridge.ts` (+ testler)
- **Webhook ve güvenlik** — Yukarıda listelenen `webhook-intake` ve `webhook-security`.
- **Proje anlama yenileme**
  - `electron/runtime/project-understanding-loader/` — Artefakt yükleme
  - `electron/runtime/project-understanding-auto-refresh/` — Tazelik kontrolü ve yenileme
- **Advisory runtime depolama ve IPC**
  - `electron/runtime/runtime-advisory-projection/` — `OperatorRuntimeAdvisoryProjection`, mapper
  - `electron/runtime/operator-advisory-runtime/` — Bellek içi `get/setCurrentOperatorAdvisoryProjection`
  - `electron/runtime/operator-advisory-ipc/` — Salt okunur IPC handler (`operator:get-advisory-projection`)
- **Operatör görünürlük / köprü yolu / advisory view**
  - `electron/runtime/operator-visibility/` — OC-8: `OperatorVisibilitySnapshot`, `readOperatorVisibilitySnapshot`
  - `electron/runtime/operator-bridge-path/` — OC-9: `OperatorBridgePathAdvisory`, `readOperatorBridgePathAdvisory`
  - `electron/runtime/operator-advisory-view/` — OC-10: `OperatorAdvisoryView`, `readOperatorAdvisoryView`

---

### OPERATOR SURFACES (Operatör Yüzeyleri)

**Açıklama:** Operatörün gördüğü read modelleri; UI değil, sözleşme ve türetilmiş veri katmanı.

- **Advisory projeksiyon** — `electron/runtime/runtime-advisory-projection/`
- **Görünürlük anlık görüntüsü** — `electron/runtime/operator-visibility/`
- **Köprü yolu açıklanabilirliği** — `electron/runtime/operator-bridge-path/`
- **Operatör advisory view** — `electron/runtime/operator-advisory-view/`
- **Masaüstü read modelleri**
  - `src/shared/read-models/` — Genel read-model sözleşmeleri
  - `src/desktop/backbone/` — `backbone-read.service.ts`, mapper’lar, adapter’lar
  - `src/desktop/analysis/`, `decision/`, `telemetry/` — Görünüm mapper’ları

---

### DESKTOP CONTROL CENTER (Masaüstü Kontrol Merkezi)

**Açıklama:** Electron masaüstü uygulaması; IPC, preload ve renderer panel’leri.

- **Electron main / IPC**
  - `electron/desktop/main.ts` — Pencere oluşturma, boot
  - `electron/ipc/` — `ipc-registry.ts`, `ipc-channels.ts`, `handlers/` (health-check, backbone-read, version), `repair/trigger-repair-run-ipc.ts`
  - `electron/desktop/allowed-ipc-channels.ts` — İzin listesi
  - `electron/desktop/preload/preload.ts` — Sınırlı `desktopApi` (system, updates, repair.triggerRun, read.get*View, read.getOperatorAdvisoryProjection)
- **Engine-backed provider**
  - `electron/desktop/engine-backed-provider.ts` — Repair engine durumunu köprü üzerinden okur
- **Renderer**
  - `src/desktop/renderer/` — AppShell, Topbar, Sidebar; state machine viewer, repair timeline, analysis, decision console, telemetry dashboard
  - `src/desktop/renderer/operator-advisory.ts` — `window.desktopApi.read.getOperatorAdvisoryProjection()` yardımcısı

---

### PROJECT UNDERSTANDING (Proje Anlama)

**Açıklama:** Proje bağımlılıkları, modül haritası, risk ve sahiplik çıkarımı.

- **Araçlar** — `tools/project-understanding/` (dependency-graph, module-mapping, risk-hotspots, ownership-inference + testler)
- **Runtime** — `electron/runtime/project-understanding-loader/`, `project-understanding-auto-refresh/`
- **Trunk içi model** — `src/repair-engine/project-understanding-runtime/`

---

### FACTORY SYSTEMS (Fabrika Sistemleri)

**Açıklama:** Otomasyon pipeline’ları, zamanlanmış analiz, artefakt yaşam döngüsü.

- **Mevcut:** `.ai-devos/architecture-summary.json`, `docs/architecture-audit/` raporları, CI workflow’ları
- **Eksik:** Tek bir “fabrika pipeline” katmanı olarak modellenmiş, zamanlanmış çalıştırma veya artefakt deposu yok.

---

## SECTION 2 — UYGULAMA DURUMU

Her katman için durum ve repository kanıtı.

| Katman | Durum | Kanıt |
|--------|--------|--------|
| **TRUNK (src/repair-engine)** | **FULLY IMPLEMENTED** (Tam uygulanmış) | Orchestrator, state-machine, strategy, verdict, observability, operator-decision, queue, timeline, audit, contracts altında çok sayıda modül ve 100+ unit test; Electron import’u yok. |
| **GOVERNANCE** | **PARTIALLY IMPLEMENTED** (Kısmen uygulanmış) | Risk/zone/security-policy ve policy-integration mevcut ve testli; “governance risk bureau” veya kalıcı governance kayıt katmanı yok. |
| **GITHUB BACKBONE** | **FULLY IMPLEMENTED** | event-intake → pr-inspection → pr-intelligence → intake-bridge → orchestrator mapping; Electron webhook-intake pipeline ve testleri mevcut. |
| **HERO MINISTRY** | **FULLY IMPLEMENTED** | Sözleşmeler, registry, selection, runtime, birden fazla hero ve testler (selection, execution, projection, integration) mevcut. |
| **RUNTIME ADAPTER LAYER** | **FULLY IMPLEMENTED** | repair-engine-bridge, webhook-intake, webhook-security, project-understanding loader/refresh, heroes-runtime, advisory store, advisory IPC, operator-visibility, operator-bridge-path, operator-advisory-view; hepsi testli. |
| **OPERATOR SURFACES** | **FULLY IMPLEMENTED** | OperatorRuntimeAdvisoryProjection, OperatorVisibilitySnapshot, OperatorBridgePathAdvisory, OperatorAdvisoryView tanımlı; türetme ve read fonksiyonları testli. |
| **DESKTOP CONTROL CENTER** | **PARTIALLY IMPLEMENTED** | IPC allow-list, preload, engine-backed provider tam; renderer panel’leri (timeline, state machine, decision, analysis, telemetry) var; operatör advisory için tam bir “konsol” yüzeyi yok, sadece IPC + minimal helper. |
| **PROJECT UNDERSTANDING** | **PARTIALLY IMPLEMENTED** | Araçlar ve runtime yükleme/yenileme uygulanmış; operatöre yönelik “proje anlama konsolu” yok. |
| **FACTORY SYSTEMS** | **STRUCTURE EXISTS** (Sadece yapı var) | Analiz ve audit araçları var; tek bir fabrika pipeline katmanı (zamanlanmış çalıştırma, artefakt yaşam döngüsü) uygulanmamış. |

---

## SECTION 3 — SİSTEM BUGÜN NE YAPABİLİYOR

Repository kanıtına göre sistemin **şu anki** yetenekleri:

- **GitHub entegrasyonu**
  - GitHub webhook’larını Electron webhook sunucusu ile kabul eder.
  - Olayları normalize eder, imza doğrular.
  - Pull request’leri inceler; PR intelligence (boyut, karmaşıklık, bağlam) türetir.

- **Onarım motoru orkestrasyonu**
  - GitHub olaylarını onarım motoru girişine map’ler.
  - Deterministik onarım orkestrasyonu çalıştırır (durum makinesi, strateji, verdict).
  - Onarım çalıştırmalarını, timeline ve observability verilerini takip eder.

- **Hero analizi**
  - Bağlama göre hero’ları seçer ve advisory modda çalıştırır.
  - Hero çıktılarını tek bir hero runtime sonucunda toplar.

- **Governance**
  - Risk ve bölge sınıflandırır; güvenlik politikası değerlendirir; governance gate kararı türetir.
  - Bu sonuçlar onarım ve operatör karar yüzeylerine entegre edilir.

- **Operatör advisory**
  - Hero runtime sonucunu `OperatorRuntimeAdvisoryProjection` olarak map’ler.
  - Webhook yanıtında (OC-6) isteğe bağlı advisory döner.
  - Güncel advisory projeksiyonunu bellek içi runtime store’da tutar.

- **Operatör görünürlük ve açıklanabilirlik**
  - `OperatorVisibilitySnapshot`: advisory varlığı ve projeksiyon (hasAdvisory, advisoryProjection, source).
  - `OperatorBridgePathAdvisory`: Aşamalı pipeline yolu (webhook-intake → pr-inspection → hero-analysis → governance → advisory-projection) ve özetler.
  - `OperatorAdvisoryView`: Görünürlük + köprü yolu + status alanlarıyla tek operatör sözleşmesi.

- **Masaüstü kontrol merkezi**
  - Engine-backed read modellerini IPC ve preload ile sunar (repair run, state machine, failure timeline, GPT analysis, repair strategy, telemetry, decisions).
  - Operatör tetiklemeli repair run (IPC komutu, repair engine ile).
  - Renderer’da timeline, state machine, decision console, analysis, telemetry panel’leri.
  - `window.desktopApi.read.getOperatorAdvisoryProjection()` ile güncel advisory okunabilir.

- **Proje anlama araçları**
  - Bağımlılık grafiği, modül eşlemesi, risk hotspot’ları, ownership inference üretir (araçlar + testler).
  - Runtime’da proje anlama artefaktlarını tazelik kontrolü ile yeniler.

---

## SECTION 4 — MİMARİ BOŞLUKLAR

Sistemde eksik veya zayıf olan önemli mimari bileşenler:

1. **Kalıcı advisory geçmişi ve incident bazlı operatör görünümü**
   - Advisory projeksiyon, görünürlük, köprü yolu ve view yalnızca **anlık (snapshot)** ve **bellek içi**.
   - Zaman içinde advisory anlık görüntülerini kaydeden veya incident/PR bazında sorgulayan bir katman yok.

2. **Operatör karar iş akışı katmanı**
   - Trunk’ta operatör karar yüzeyi modelleniyor; ancak operatörün “onaylama / reddetme” akışını yöneten ayrı bir runtime “operator decision workflow” servisi yok.

3. **Operatör advisory konsolu (birleşik yüzey)**
   - Masaüstünde birçok panel var; ancak `OperatorAdvisoryView`’ı merkeze alan tek bir “Operatör Advisory Konsolu” yok; advisory view henüz renderer’da tam tüketilmiyor.

4. **Fabrika sistemleri (tek katman olarak)**
   - Proje anlama, risk hotspot, ownership inference araçları var; ancak bunları zamanlayan, sonuçları saklayan veya üst katmanlara besleyen bir “fabrika pipeline” katmanı yok.

5. **Proje / operatör kimlik katmanı**
   - Governance ve onarım motoru risk ve bölge kullanıyor; ancak “proje kimliği” veya “operatör kimliği” için açık bir runtime sözleşmesi katmanı tanımlı değil.

---

## SECTION 5 — SIRADAKİ EN ÖNEMLİ KATMAN

**Katman adı:** Operatör Advisory Timeline ve Geçmiş Katmanı (Operator Advisory Timeline & History Layer)

**Neden bu katman sıradaki en önemli adım?**

- Advisory tarafı **anlık görüntü** seviyesinde zengin: mevcut advisory, nasıl oluştuğu (bridge path) ve birleşik view (OperatorAdvisoryView) mevcut.
- Eksik olan **zaman boyutu**: incident/PR başına advisory durumlarının kalıcı, sorgulanabilir geçmişi yok.
- “AI analiz eder, AI önerir, insan karar verir” ilkesi için operatörün “ne önerildi, neye karar verildi” geçmişini görebilmesi gerekir; bu da advisory’nin zamana yayılmış kaydını gerektirir.

**Mevcut sistemle nasıl bağlanıyor?**

- **Girdi:** `OperatorAdvisoryView` (mevcut canonical snapshot).
- **Çıktı:** Incident/PR bazında zaman sıralı advisory anlık görüntüleri; ileride masaüstü timeline veya audit için kullanılabilir.
- **Bağlantı noktaları:** GitHub backbone ve repair engine observability (incident/run/PR kimlikleri) ile eşleştirilerek advisory snapshot’ları kayıt altına alınabilir.

---

## SECTION 6 — ÖNERİLEN YENİ GATE

**Gate adı:** OC-11 — Operatör Advisory Timeline Katmanı (Operator Advisory Timeline Layer)

**Tek cümle görev tanımı:**  
Incident/PR bazında operatör advisory anlık görüntülerinin geçmişini tutan ve okuyan, deterministik ve yalnızca runtime’da çalışan bir timeline read modeli katmanı eklemek; yürütme yetkisini değiştirmemek.

**Bu gate neden sıradaki doğru adım?**
- OC-5/8/9/10 ile üretilen advisory view’ı “zaman” ve “incident” ile ilişkilendirir.
- Operatörün “öneri nasıl evrildi” sorusunu yanıtlamaya ve ileride audit/consol için temel oluşturmaya uygundur.
- Deterministik çekirdeği değiştirmez; yalnızca `electron/runtime` altında yeni bir read modeli ve (opsiyonel) hafif depolama adapter’ı ekler.

**Hangi yeni modüller oluşacak (özet)?**
- `electron/runtime/operator-advisory-timeline/` (veya benzeri isim) altında:
  - Timeline entry tipi (incident/PR id, zaman/sıra, OperatorAdvisoryView snapshot).
  - Snapshot’ları incident’e göre kaydeden hafif store/adapter (başlangıçta bellek içi veya append-only).
  - `recordOperatorAdvisorySnapshot(...)` (veya eşdeğer): View + incident bağlamı → entry.
  - `readOperatorAdvisoryTimeline(incidentId)`: Bir incident için geçmişi dönen canonical read.
  - İlgili unit testler (deterministik çekirdeğe dokunulmadığını ve sözleşme kararlılığını doğrulayan).

---

## SECTION 7 — MİMARİ RİSK KONTROLÜ

**Önerilen yeni gate deterministic core’u koruyor mu?**  
**EVET (YES)**

**Kısa açıklama:**  
Önerilen OC-11 katmanı yalnızca `electron/runtime/operator-advisory-timeline/` (veya eşdeğer) altında yaşar; `src/repair-engine` içinde hiçbir değişiklik yapmaz. Mevcut canonical read’leri (`readOperatorAdvisoryView`) tüketir; orchestrator veya repair-engine sözleşmelerini değiştirmez. Kalıcılık eklenirse bile bu, runtime adapter (ör. SQLite/dosya) ile sınırlı kalır ve deterministik çekirdeği kirletmez.

---

*Rapor, repository yapısı ve mevcut dosya içeriklerine dayanarak üretilmiştir. Kod değişikliği yapılmamıştır.*
